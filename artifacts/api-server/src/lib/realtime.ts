import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import cookie from "cookie-parser";
import { promisify } from "util";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db, pool, conversationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import {
  recordWsAuthFailure,
  recordWsConnect,
  recordWsDisconnect,
  recordWsMessage,
  syncWsUsersGauge,
} from "./observability";
import { getSessionSecret } from "./session-secret";
import { SESSION_COOKIE_NAME } from "./session-cookie";
import { eitherUserBlocksTheOther } from "./user-blocks";

const PgStore = connectPgSimple(session);
const store = new PgStore({ pool, tableName: "user_sessions" });

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const SESSION_SECRET = getSessionSecret();

const cookieParserMw = cookie(SESSION_SECRET);
const cookieParserAsync: (req: IncomingMessage, res: object, cb: () => void) => void = cookieParserMw as never;

const storeGet = promisify<string, session.SessionData | null>(store.get.bind(store) as never);

const userSockets = new Map<number, Set<WebSocket>>();

/** Ref-count views of (userId, conversationId) for presence-based delivery. */
const conversationFocusRefCounts = new Map<string, number>();

const wsUserId = new WeakMap<WebSocket, number>();
const wsFocusStack = new WeakMap<WebSocket, Array<{ convId: number }>>();

/** Limits typing:start fan-out per user+conversation (client may renew while composing). */
const TYPING_START_MIN_INTERVAL_MS = 750;
const typingStartLastSentMs = new Map<string, number>();

function typingThrottleKey(userId: number, convId: number) {
  return `${userId}:${convId}`;
}

async function getConversationMemberRow(
  convId: number,
  memberId: number,
): Promise<{ buyerId: number; sellerId: number } | null> {
  try {
    const rows = await db
      .select({
        buyerId: conversationsTable.buyerId,
        sellerId: conversationsTable.sellerId,
      })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, convId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    if (r.buyerId !== memberId && r.sellerId !== memberId) return null;
    return r;
  } catch (err) {
    logger.warn({ err, convId }, "typing: conversation lookup failed");
    return null;
  }
}

async function relayTypingIndicator(fromUserId: number, convId: number, active: boolean): Promise<void> {
  const row = await getConversationMemberRow(convId, fromUserId);
  if (!row) return;
  const peerId = row.buyerId === fromUserId ? row.sellerId : row.buyerId;
  if (await eitherUserBlocksTheOther(fromUserId, peerId)) return;

  if (active) {
    if (!isUserFocusedOnConversation(peerId, convId)) return;
    const now = Date.now();
    const tk = typingThrottleKey(fromUserId, convId);
    const last = typingStartLastSentMs.get(tk) ?? 0;
    if (now - last < TYPING_START_MIN_INTERVAL_MS) return;
    typingStartLastSentMs.set(tk, now);
  } else {
    typingStartLastSentMs.delete(typingThrottleKey(fromUserId, convId));
    if (!isUserFocusedOnConversation(peerId, convId)) return;
  }

  broadcastToUser(peerId, {
    type: "typing",
    conversationId: convId,
    userId: fromUserId,
    active,
  });
}

/** After disconnect or HTTP message send — tell peer to clear typing without focus check. */
async function relayTypingStopToPeer(fromUserId: number, convId: number): Promise<void> {
  const row = await getConversationMemberRow(convId, fromUserId);
  if (!row) return;
  const peerId = row.buyerId === fromUserId ? row.sellerId : row.buyerId;
  if (await eitherUserBlocksTheOther(fromUserId, peerId)) return;
  typingStartLastSentMs.delete(typingThrottleKey(fromUserId, convId));
  broadcastToUser(peerId, {
    type: "typing",
    conversationId: convId,
    userId: fromUserId,
    active: false,
  });
}

export function broadcastTypingStoppedForSender(convId: number, senderId: number): void {
  void relayTypingStopToPeer(senderId, convId);
}

function focusKey(userId: number, convId: number): string {
  return `${userId}:${convId}`;
}

export function registerConversationFocus(userId: number, convId: number): void {
  const k = focusKey(userId, convId);
  conversationFocusRefCounts.set(k, (conversationFocusRefCounts.get(k) ?? 0) + 1);
}

export function unregisterConversationFocus(userId: number, convId: number): void {
  const k = focusKey(userId, convId);
  const next = (conversationFocusRefCounts.get(k) ?? 1) - 1;
  if (next <= 0) conversationFocusRefCounts.delete(k);
  else conversationFocusRefCounts.set(k, next);
}

/** True if user has this conversation open (WebSocket focus / thread visible). */
export function isUserFocusedOnConversation(userId: number, convId: number): boolean {
  return (conversationFocusRefCounts.get(focusKey(userId, convId)) ?? 0) > 0;
}

function pushConversationFocus(ws: WebSocket, userId: number, convId: number): void {
  registerConversationFocus(userId, convId);
  let stack = wsFocusStack.get(ws);
  if (!stack) {
    stack = [];
    wsFocusStack.set(ws, stack);
  }
  stack.push({ convId });
}

function popConversationFocus(ws: WebSocket, userId: number, convId: number): void {
  const stack = wsFocusStack.get(ws);
  if (!stack?.length) {
    unregisterConversationFocus(userId, convId);
    return;
  }
  const idx = stack.map((x) => x.convId).lastIndexOf(convId);
  if (idx >= 0) stack.splice(idx, 1);
  unregisterConversationFocus(userId, convId);
}

function clearConversationFocusForSocket(ws: WebSocket, userId: number): void {
  const stack = wsFocusStack.get(ws);
  wsFocusStack.delete(ws);
  if (!stack?.length) return;
  const uniqueConvIds = [...new Set(stack.map((s) => s.convId))];
  for (const { convId } of stack) {
    unregisterConversationFocus(userId, convId);
  }
  for (const convId of uniqueConvIds) {
    void relayTypingStopToPeer(userId, convId);
  }
}

export function getSocketsForUser(userId: number): WebSocket[] {
  const set = userSockets.get(userId);
  return set ? Array.from(set) : [];
}

export function broadcastToUser(userId: number, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const ws of getSocketsForUser(userId)) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (err) {
        logger.warn({ err, userId }, "ws send failed");
      }
    }
  }
}

/** True if this API process currently holds at least one open chat WebSocket for the user. */
export function isUserSocketConnected(userId: number): boolean {
  const set = userSockets.get(userId);
  return set !== undefined && set.size > 0;
}

/**
 * Distinct signed-in app users with ≥1 open `/api/ws` connection on this API process.
 * Multiple tabs for the same user share one `userId` key → counted once.
 */
export function countUsersWithOpenChatSockets(): number {
  return userSockets.size;
}

async function markUserLastSeenAt(userId: number): Promise<void> {
  try {
    await pool.query("UPDATE users SET last_seen_at = now() WHERE id = $1", [userId]);
  } catch (err) {
    logger.warn({ err, userId }, "failed to update last_seen_at on ws disconnect");
  }
}

async function resolveUserIdFromRequest(req: IncomingMessage): Promise<number | null> {
  return await new Promise((resolve) => {
    cookieParserAsync(req, {}, async () => {
      try {
        const signed = (req as unknown as { signedCookies?: Record<string, string> }).signedCookies;
        const sid = signed?.[SESSION_COOKIE];
        if (!sid) return resolve(null);
        const sess = await storeGet(sid);
        if (!sess) return resolve(null);
        const userId = (sess as { userId?: number }).userId;
        resolve(typeof userId === "number" ? userId : null);
      } catch (err) {
        logger.warn({ err }, "ws session lookup failed");
        resolve(null);
      }
    });
  });
}

export function attachWebSocketServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req, socket, head) => {
    const { pathname } = parseUrl(req.url || "");
    if (pathname !== "/api/ws") return;

    const userId = await resolveUserIdFromRequest(req);
    if (!userId) {
      recordWsAuthFailure();
      logger.warn({ path: "/api/ws" }, "websocket auth rejected");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wsUserId.set(ws, userId);
      register(userId, ws);
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    recordWsConnect();
    syncWsUsersGauge(userSockets.size);

    ws.on("message", (raw) => {
      recordWsMessage();
      const uid = wsUserId.get(ws);
      // Heartbeat / ping handling — clients can send {type:"ping"}; we just echo {type:"pong"}.
      try {
        const msg = JSON.parse(String(raw)) as {
          type?: string;
          conversationId?: unknown;
          active?: unknown;
        };
        if (msg?.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
        if (
          uid != null &&
          msg?.type === "conversation:focus" &&
          typeof msg.conversationId === "number" &&
          Number.isInteger(msg.conversationId)
        ) {
          const convId = msg.conversationId;
          const active = msg.active !== false;
          if (active) pushConversationFocus(ws, uid, convId);
          else popConversationFocus(ws, uid, convId);
          return;
        }
        if (uid != null && typeof msg.conversationId === "number" && Number.isInteger(msg.conversationId)) {
          const convId = msg.conversationId;
          if (msg.type === "typing:start") {
            void relayTypingIndicator(uid, convId, true);
            return;
          }
          if (msg.type === "typing:stop") {
            void relayTypingIndicator(uid, convId, false);
            return;
          }
          if (msg.type === "typing" && typeof msg.active === "boolean") {
            void relayTypingIndicator(uid, convId, msg.active);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    });
  });

  logger.info("WebSocket server attached at /api/ws");
}

function register(userId: number, ws: WebSocket) {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(ws);
  syncWsUsersGauge(userSockets.size);
  ws.on("close", () => {
    clearConversationFocusForSocket(ws, userId);
    set!.delete(ws);
    if (set!.size === 0) {
      userSockets.delete(userId);
      void markUserLastSeenAt(userId);
    }
    wsUserId.delete(ws);
    recordWsDisconnect();
    syncWsUsersGauge(userSockets.size);
  });
}
