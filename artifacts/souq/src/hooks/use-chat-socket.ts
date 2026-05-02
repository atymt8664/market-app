import { useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/api-url";

/** Used only for WebSocket (HTTP API stays same-origin via Vercel → Railway). */
const PRODUCTION_RAILWAY_HTTP_ORIGIN = "https://workspaceapi-server-production-22f2.up.railway.app";

export type ChatSocketEvent =
  | { type: "message"; conversationId: number; message: { id: number; conversationId: number; senderId: number; body: string; createdAt: string; readAt: string | null } }
  | { type: "pong" };

export function buildWsUrl(): string {
  const base = getApiBaseUrl();
  if (base) {
    try {
      const u = new URL(base);
      const proto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${u.host}/api/ws`;
    } catch {
      /* fall through */
    }
  }
  // Same-origin /api works for fetch, but Vercel external rewrites do not reliably proxy
  // WebSocket upgrades — connect WS directly to Railway in production while session cookie
  // remains SameSite=None for cross-site credentialed requests.
  if (import.meta.env.PROD) {
    const override = import.meta.env.VITE_WS_HTTP_ORIGIN?.trim();
    const httpOrigin = override || PRODUCTION_RAILWAY_HTTP_ORIGIN;
    try {
      const u = new URL(httpOrigin);
      const proto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${u.host}/api/ws`;
    } catch {
      /* fall through */
    }
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

export function useChatSocket(onEvent: (e: ChatSocketEvent) => void): { send: (data: unknown) => void } {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let alive = true;
    let retry = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (!alive) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(buildWsUrl());
      } catch {
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as ChatSocketEvent;
          handlerRef.current(data);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = null;
        wsRef.current = null;
        if (!alive) return;
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 1000 * retry);
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* ignore */ }
      };
    };

    connect();
    return () => {
      alive = false;
      if (pingTimer) clearInterval(pingTimer);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  return {
    send: (data: unknown) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof data === "string" ? data : JSON.stringify(data));
      }
    },
  };
}
