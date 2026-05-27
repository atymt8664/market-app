import { pool } from "@workspace/db";
import { resolvePgPoolConfig } from "@workspace/db";

export type PgPoolStatsSnapshot = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxConnections: number;
  utilizationPercent: number | null;
};

export function snapshotPgPoolStats(): PgPoolStatsSnapshot {
  const config = resolvePgPoolConfig();
  const totalCount = pool.totalCount;
  const idleCount = pool.idleCount;
  const waitingCount = pool.waitingCount;
  const maxConnections = config.max;
  const activeCount = Math.max(0, totalCount - idleCount);
  const utilizationPercent =
    maxConnections > 0 ? Math.round((activeCount / maxConnections) * 1000) / 10 : null;

  return {
    totalCount,
    idleCount,
    waitingCount,
    maxConnections,
    utilizationPercent,
  };
}
