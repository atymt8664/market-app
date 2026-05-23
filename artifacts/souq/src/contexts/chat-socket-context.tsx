import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { buildWsUrlFromBrowser } from "@/lib/build-ws-url";

export type ChatSocketEvent =
  | {
      type: "message";
      conversationId: number;
      message: {
        id: number;
        conversationId: number;
        senderId: number;
        body: string;
        messageType?: "text" | "image" | "location";
        imageUrl?: string | null;
        createdAt: string;
        deliveredAt: string | null;
        readAt: string | null;
      };
    }
  | {
      type: "typing";
      conversationId: number;
      userId: number;
      active: boolean;
    }
  | {
      type: "messages_removed";
      conversationId: number;
      messageIds: number[];
      /** Present when delete-for-everyone (tombstone); omit for legacy hide-only flows. */
      deletedForEveryoneAt?: string;
    }
  | { type: "pong" };

export { buildWsUrlFromBrowser as buildWsUrl } from "@/lib/build-ws-url";

type Listener = (e: ChatSocketEvent) => void;

type ChatSocketContextValue = {
  subscribe: (fn: Listener) => () => void;
  send: (data: unknown) => void;
};

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function isMessagesFlowPath(loc: string): boolean {
  const normalized = loc.replace(/\/+$/, "") || "/";
  if (normalized === "/messages") return true;
  return /^\/messages\/[^/]+$/.test(normalized);
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const inMessagesFlow = isMessagesFlowPath(loc);

  const listenersRef = useRef(new Set<Listener>());
  const wsRef = useRef<WebSocket | null>(null);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const emit = useCallback((e: ChatSocketEvent) => {
    for (const fn of [...listenersRef.current]) {
      try {
        fn(e);
      } catch {
        /* isolate subscriber errors */
      }
    }
  }, []);

  useEffect(() => {
    if (!inMessagesFlow) {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
      return;
    }

    let alive = true;
    let retry = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (!alive) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(buildWsUrlFromBrowser());
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
          emit(data);
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
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();
    return () => {
      alive = false;
      if (pingTimer) clearInterval(pingTimer);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
    };
  }, [inMessagesFlow, emit]);

  const send = useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }, []);

  const value = useMemo(
    () => ({
      subscribe,
      send,
    }),
    [subscribe, send],
  );

  return (
    <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
  );
}

export function useChatSocket(onEvent: (e: ChatSocketEvent) => void): {
  send: (data: unknown) => void;
} {
  const ctx = useContext(ChatSocketContext);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!ctx) return;
    const listener: Listener = (e) => {
      handlerRef.current(e);
    };
    return ctx.subscribe(listener);
  }, [ctx]);

  const send = useCallback(
    (data: unknown) => {
      ctx?.send(data);
    },
    [ctx],
  );

  return { send };
}
