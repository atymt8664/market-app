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
      register(userId, ws);
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      // Heartbeat / ping handling — clients can send {type:"ping"}; we just echo {type:"pong"}.
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
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
    set!.delete(ws);
    if (set!.size === 0) userSockets.delete(userId);
  });
}
