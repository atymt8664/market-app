import { useEffect, useRef } from "react";

export type ChatSocketEvent =
  | { type: "message"; conversationId: number; message: { id: number; conversationId: number; senderId: number; body: string; createdAt: string; readAt: string | null } }
  | { type: "pong" };

export function buildWsUrl(): string {
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
