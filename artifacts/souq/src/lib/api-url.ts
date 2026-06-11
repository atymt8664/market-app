/** Official production API host — Vercel has no `/api` rewrite to VPS. */
const PRODUCTION_API_HOSTS = new Set(["www.souq-arab.com", "souq-arab.com"]);
const PRODUCTION_API_BASE = "https://api.souq-arab.com";

/**
 * API host from `VITE_API_BASE_URL` (e.g. https://api.souq-arab.com on Vercel).
 * When empty in local dev, use same-origin paths (Vite proxy).
 * When empty on production www, fall back to api.souq-arab.com (Vercel serves HTML for /api/*).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === "string" && raw.trim()) return raw.trim().replace(/\/+$/, "");

  if (
    import.meta.env.PROD &&
    typeof window !== "undefined" &&
    PRODUCTION_API_HOSTS.has(window.location.hostname.toLowerCase())
  ) {
    return PRODUCTION_API_BASE;
  }

  return "";
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
