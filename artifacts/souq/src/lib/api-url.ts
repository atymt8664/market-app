/**
 * Production API host from Vercel (`VITE_API_BASE_URL`). When empty, use same-origin
 * paths so local dev keeps Vite `/api` proxy.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string") return "";
  // In production, prefer same-origin `/api` (Vercel rewrite -> Railway) so session
  // cookies are first-party. Local/dev can still set VITE_API_BASE_URL for direct API.
  if (import.meta.env.PROD) {
    return "";
  }
  return raw.trim().replace(/\/+$/, "");
}

/** Resolve a path like `/api/...` to a full URL when a base is configured. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
