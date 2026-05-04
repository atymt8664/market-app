import type { CorsOptions } from "cors";

const PRODUCTION_ORIGINS = new Set([
  "https://souq-arab.com",
  "https://www.souq-arab.com",
]);

/** Browsers during local dev (Vite and common alt ports). */
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Strict CORS: production allows only the live site(s); development allows localhost.
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
      callback(null, PRODUCTION_ORIGINS.has(origin));
      return;
    }
    callback(null, DEV_ORIGIN.test(origin));
  };
}
