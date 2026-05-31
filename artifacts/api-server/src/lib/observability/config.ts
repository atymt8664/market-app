const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

export const OBSERVABILITY = {
  slowHttpMs: envInt("SLOW_HTTP_MS", 2000),
  slowDbMs: envInt("SLOW_DB_MS", 500),
  slowSearchMs: envInt("SLOW_SEARCH_MS", 1000),
  readyzDbTimeoutMs: envInt("READYZ_DB_TIMEOUT_MS", 3000),
  latencySampleSize: envInt("OBSERVABILITY_LATENCY_SAMPLES", 2000),
  /**
   * Admin-only JSON metrics snapshot (no secrets).
   * Enabled by default — route is protected by admin session + IP allowlist.
   * Set OBSERVABILITY_METRICS_ENABLED=0 to hide the endpoint entirely.
   */
  metricsEndpointEnabled: envBool("OBSERVABILITY_METRICS_ENABLED", true),
  /** Public vitals ingest (RUM). Disable with OBSERVABILITY_VITALS_ENABLED=0. */
  vitalsIngestEnabled: envBool("OBSERVABILITY_VITALS_ENABLED", true),
  /** Server-side sample gate (0–100). Client also samples. Default 100 STAGING / 10 PRODUCTION. */
  vitalsSampleRatePercent: envInt("OBSERVABILITY_VITALS_SAMPLE_RATE_PERCENT", 0),
} as const;

function resolveDefaultVitalsSampleRate(): number {
  const configured = OBSERVABILITY.vitalsSampleRatePercent;
  if (configured > 0) return Math.min(100, configured);
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  return nodeEnv === "production" ? 10 : 100;
}

export function shouldAcceptVitalsSample(): boolean {
  if (!OBSERVABILITY.vitalsIngestEnabled) return false;
  const rate = resolveDefaultVitalsSampleRate();
  if (rate >= 100) return true;
  return Math.random() * 100 < rate;
}
