/**
 * Session signing secret. In production, `SESSION_SECRET` is mandatory.
 * In development, a local fallback keeps `pnpm dev` usable without a `.env`.
 */
export function getSessionSecret(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const trimmed = process.env["SESSION_SECRET"]?.trim();
  if (isProduction) {
    if (!trimmed) {
      throw new Error(
        "SESSION_SECRET is required in production. Set a strong random value in the server environment.",
      );
    }
    return trimmed;
  }
  return trimmed || "dev-secret-change-me";
}
