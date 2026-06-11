import { getApiBaseUrl } from "@/lib/api-url";

/**
 * Resolve WebSocket URL for chat realtime.
 *
 * Priority:
 * 1. getApiBaseUrl() (VITE_API_BASE_URL or production www fallback)
 * 2. VITE_WS_HTTP_ORIGIN (optional override)
 * 3. Same-origin window host (local dev proxy)
 */
export type BuildWsUrlInput = {
  apiBaseUrl: string;
  wsHttpOriginOverride: string;
  isProd: boolean;
  windowProtocol: string;
  windowHost: string;
};

export function buildWsUrl(input: BuildWsUrlInput): string {
  const base = input.apiBaseUrl.trim();
  if (base) {
    try {
      const u = new URL(base);
      const proto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${u.host}/api/ws`;
    } catch {
      /* fall through */
    }
  }

  const override = input.wsHttpOriginOverride.trim();
  if (override) {
    try {
      const u = new URL(override);
      const proto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${u.host}/api/ws`;
    } catch {
      /* fall through */
    }
  }

  const proto = input.windowProtocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${input.windowHost}/api/ws`;
}

/** Browser entry — reads Vite env + window location. */
export function buildWsUrlFromBrowser(): string {
  const apiBase = getApiBaseUrl();
  const wsOverride =
    typeof import.meta.env.VITE_WS_HTTP_ORIGIN === "string"
      ? import.meta.env.VITE_WS_HTTP_ORIGIN
      : "";

  return buildWsUrl({
    apiBaseUrl: apiBase,
    wsHttpOriginOverride: wsOverride,
    isProd: import.meta.env.PROD,
    windowProtocol:
      typeof window !== "undefined" ? window.location.protocol : "https:",
    windowHost:
      typeof window !== "undefined" ? window.location.host : "localhost",
  });
}
