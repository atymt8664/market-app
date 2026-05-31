import type { ServerMetricsSnapshot } from "./observability/server-metrics";

/** Linux load average from Node `os.loadavg()` on the API host (same source as Monitoring page). */
export type NocCpuLive = {
  available: true;
  cores: number;
  loadAvg1m: number;
  loadAvg5m: number | null;
  source: "node:os.loadavg";
};

export type NocCpuUnavailable = {
  available: false;
  reason: "loadavg_unavailable";
};

export type NocCpuSnapshot = NocCpuLive | NocCpuUnavailable;

export type NocCpuGridItem = {
  status: "ok" | "warn" | "muted";
  value: number | null;
  hintParams?: { cores: number; load5: number };
  cpu: NocCpuSnapshot;
};

/** Warn when 1m load meets or exceeds logical CPU count (standard saturation heuristic). */
export function buildNocCpuFromServerMetrics(server: ServerMetricsSnapshot): NocCpuGridItem {
  const { cores, loadAvg1m, loadAvg5m } = server.cpu;
  if (loadAvg1m == null || !Number.isFinite(loadAvg1m) || cores < 1) {
    return {
      status: "muted",
      value: null,
      cpu: { available: false, reason: "loadavg_unavailable" },
    };
  }
  const rounded = Math.round(loadAvg1m * 100) / 100;
  const status = loadAvg1m >= cores ? "warn" : "ok";
  return {
    status,
    value: rounded,
    hintParams: { cores, load5: loadAvg5m ?? 0 },
    cpu: {
      available: true,
      cores,
      loadAvg1m: rounded,
      loadAvg5m,
      source: "node:os.loadavg",
    },
  };
}
