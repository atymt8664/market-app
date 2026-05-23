export type PgPoolConfig = {
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

const DEFAULT_PRODUCTION_MAX = 30;
const DEFAULT_DEVELOPMENT_MAX = 10;
const ABSOLUTE_MAX = 100;
const ABSOLUTE_MIN = 1;

/**
 * Resolves PostgreSQL pool sizing from PG_POOL_MAX.
 * Production-safe default: 30 connections (tune via env on VPS).
 */
export function resolvePgPoolConfig(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): PgPoolConfig {
  const raw = process.env.PG_POOL_MAX?.trim();
  let max: number;

  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (
      Number.isInteger(parsed) &&
      parsed >= ABSOLUTE_MIN &&
      parsed <= ABSOLUTE_MAX
    ) {
      max = parsed;
    } else {
      max =
        nodeEnv === "production" ? DEFAULT_PRODUCTION_MAX : DEFAULT_DEVELOPMENT_MAX;
    }
  } else {
    max =
      nodeEnv === "production" ? DEFAULT_PRODUCTION_MAX : DEFAULT_DEVELOPMENT_MAX;
  }

  return {
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}
