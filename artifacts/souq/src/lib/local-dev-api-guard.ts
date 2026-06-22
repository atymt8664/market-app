import { getApiBaseUrl } from "@/lib/api-url";

const PRODUCTION_APP_HOSTS = new Set(["www.souq-arab.com", "souq-arab.com"]);
const LOCAL_API_HEALTH_PATH = "/api/healthz";
const PROBE_TIMEOUT_MS = 3_500;
const POLL_INTERVAL_MS = 4_000;

/** Private/LAN hosts used by `vite` with `host: true` — still proxied local dev. */
function isLocalDevHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/**
 * Dev guard applies only when the browser uses same-origin Vite proxy (no VITE_API_BASE_URL)
 * on a local/LAN host — never on production www or remote staging frontends.
 */
export function isLocalDevApiGuardEligible(): boolean {
  if (typeof window === "undefined") return false;
  if (getApiBaseUrl()) return false;

  const host = window.location.hostname.toLowerCase();
  if (PRODUCTION_APP_HOSTS.has(host)) return false;
  if (host.endsWith(".vercel.app")) return false;

  if (import.meta.env.DEV) return isLocalDevHostname(host);
  if (import.meta.env.PROD && isLocalDevHostname(host)) return true;

  return false;
}

export async function probeLocalDevApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(LOCAL_API_HEALTH_PATH, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  }
}

export const LOCAL_DEV_API_GUARD_POLL_MS = POLL_INTERVAL_MS;
