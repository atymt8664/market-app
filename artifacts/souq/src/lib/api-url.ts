/**
 * API host from `VITE_API_BASE_URL` (e.g. https://api.example.com on Vercel).
 * When empty, use same-origin paths (Vite dev proxy or Vercel rewrite to the API).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string" || !raw.trim()) return "";
  return raw.trim().replace(/\/+$/, "");
}

/** Resolve a path like `/api/...` to a full URL when a base is configured. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  const baseNorm = base.replace(/\/+$/, "");
  if (!baseNorm) return p;
  if (baseNorm.endsWith("/api")) {
    if (p === "/api") return baseNorm;
    if (p.startsWith("/api/")) {
      return `${baseNorm}${p.slice(4)}`;
    }
  }
  return `${baseNorm}${p}`;
}
