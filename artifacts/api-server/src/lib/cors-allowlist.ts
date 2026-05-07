import type { CorsOptions } from "cors";

const PRODUCTION_ORIGINS = new Set([
  "https://souq-arab.com",
  "https://www.souq-arab.com",
]);

function loadOriginsFromEnv(): string[] {
  const raw = process.env["CORS_ALLOWED_ORIGINS"]?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.includes("*"));
}

/** Browsers during local dev (Vite and common alt ports). */
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Private LAN IPv4 (RFC1918) so Vite at http://10.x.x.x:5173 can call the API on the same host.
 * Development only — production branch never uses this.
 */
const DEV_PRIVATE_LAN_ORIGIN =
  /^https?:\/\/(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$/;

function isAllowedDevOrigin(origin: string): boolean {
  return DEV_ORIGIN.test(origin) || DEV_PRIVATE_LAN_ORIGIN.test(origin);
}

/**
 * Strict CORS: production allows only the live site(s); development allows localhost + LAN IPs.
 * Requests with no `Origin` (e.g. health checks, curl) are allowed so load balancers still work.
 */
export function createCorsOriginHandler(
  isProduction: boolean,
): NonNullable<CorsOptions["origin"]> {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (isProduction) {
      const extra = new Set(loadOriginsFromEnv());
      callback(null, PRODUCTION_ORIGINS.has(origin) || extra.has(origin));
      return;
    }
    callback(null, isAllowedDevOrigin(origin));
  };
}
