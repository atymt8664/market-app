import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import cookie from "cookie-parser";
import { promisify } from "util";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import { logger } from "./logger";

const PgStore = connectPgSimple(session);
const store = new PgStore({ pool, tableName: "user_sessions" });

const SESSION_COOKIE = "souq.sid";
const SESSION_SECRET = process.env["SESSION_SECRET"] || "dev-secret-change-me";

const cookieParserMw = cookie(SESSION_SECRET);
const cookieParserAsync: (req: IncomingMessage, res: object, cb: () => void) => void = cookieParserMw as never;

const storeGet = promisify<string, session.SessionData | null>(store.get.bind(store) as never);

const userSockets = new Map<number, Set<WebSocket>>();

/** Ref-count views of (userId, conversationId) for presence-based delivery. */
const conversationFocusRefCounts = new Map<string, number>();

const wsUserId = new WeakMap<WebSocket, number>();
const wsFocusStack = new WeakMap<WebSocket, Array<{ convId: number }>>();

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
  for (const { convId } of stack) {
    unregisterConversationFocus(userId, convId);
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
    ws.on("message", (raw) => {
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
  ws.on("close", () => {
    clearConversationFocusForSocket(ws, userId);
    set!.delete(ws);
    if (set!.size === 0) userSockets.delete(userId);
    wsUserId.delete(ws);
  });
}
