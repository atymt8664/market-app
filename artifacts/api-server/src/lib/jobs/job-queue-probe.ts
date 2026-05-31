import type { InfrastructureComponentStatus } from "../admin-infrastructure-health";
import { isJobQueueEnabled } from "./env-guard";
import { DLQ_QUEUE_NAME } from "./dlq";
import { getQueueModuleOrNull, startQueueModule } from "./queue-module";
import {
  collectQueueHealthSnapshot,
  summarizeQueueDepth,
} from "./observability";
import type { QueueHealthSnapshot } from "./types";

export type PgBossProbeSnapshot = {
  configured: boolean;
  status: InfrastructureComponentStatus;
  queueDepth: number | null;
  activeCount: number | null;
  deferredCount: number | null;
  dlqDepth: number | null;
  schemaVersion: number | null;
  stagingOnly: boolean;
  health: QueueHealthSnapshot | null;
};

/** Alert thresholds aligned with P15-background-jobs.md (initial). */
export const PG_BOSS_QUEUE_DEPTH_WARNING = 100;
export const PG_BOSS_QUEUE_DEPTH_CRITICAL = 1000;
export const PG_BOSS_DLQ_DEPTH_WARNING = 10;
export const PG_BOSS_DLQ_DEPTH_CRITICAL = 50;

function deriveStatus(
  queueDepth: number,
  dlqDepth: number,
): InfrastructureComponentStatus {
  if (queueDepth >= PG_BOSS_QUEUE_DEPTH_CRITICAL || dlqDepth >= PG_BOSS_DLQ_DEPTH_CRITICAL) {
    return "fail";
  }
  if (queueDepth >= PG_BOSS_QUEUE_DEPTH_WARNING || dlqDepth >= PG_BOSS_DLQ_DEPTH_WARNING) {
    return "degraded";
  }
  return "ok";
}

/**
 * Probe pg-boss queue health from API/monitoring (read-only supervisor connection).
 * Does not start workers — safe on API process.
 */
export async function probePgBossJobQueue(): Promise<PgBossProbeSnapshot> {
  if (!isJobQueueEnabled()) {
    return {
      configured: false,
      status: "unconfigured",
      queueDepth: null,
      activeCount: null,
      deferredCount: null,
      dlqDepth: null,
      schemaVersion: null,
      stagingOnly: false,
      health: null,
    };
  }

  try {
    const boss = getQueueModuleOrNull() ?? (await startQueueModule());
    const health = await collectQueueHealthSnapshot(boss);
    const depth = summarizeQueueDepth(health);
    const dlqQueue = health.queues.find((q) => q.name === DLQ_QUEUE_NAME);
    const dlqDepth = dlqQueue?.queuedCount ?? 0;
    const totalQueued = depth.totalQueued + depth.totalDeferred;

    return {
      configured: true,
      status: deriveStatus(totalQueued, dlqDepth),
      queueDepth: totalQueued,
      activeCount: depth.totalActive,
      deferredCount: depth.totalDeferred,
      dlqDepth,
      schemaVersion: health.schemaVersion,
      stagingOnly: health.stagingOnly,
      health,
    };
  } catch {
    return {
      configured: true,
      status: "fail",
      queueDepth: null,
      activeCount: null,
      deferredCount: null,
      dlqDepth: null,
      schemaVersion: null,
      stagingOnly: false,
      health: null,
    };
  }
}
