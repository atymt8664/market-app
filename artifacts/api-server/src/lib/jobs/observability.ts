import type { PgBoss, QueueResult, WipData } from "pg-boss";
import { STAGING_SUPABASE_REF } from "./constants";
import { detectSupabaseProjectRef, isJobQueueEnabled } from "./env-guard";
import { DEFAULT_JOB_QUEUE_SCHEMA } from "./constants";
import { DLQ_QUEUE_NAME, listRegisteredQueueNames } from "./dlq";
import { readEmailJobMetrics } from "./job-queue-metrics";
import type { QueueHealthSnapshot } from "./types";

export async function collectQueueHealthSnapshot(
  boss: PgBoss,
): Promise<QueueHealthSnapshot> {
  const schema =
    process.env["JOB_QUEUE_SCHEMA"]?.trim() || DEFAULT_JOB_QUEUE_SCHEMA;
  const ref = detectSupabaseProjectRef();
  const queueNames = listRegisteredQueueNames();
  const stats = await Promise.all(
    queueNames.map(async (name) => {
      try {
        return await boss.getQueueStats(name);
      } catch {
        return null;
      }
    }),
  );

  return {
    enabled: isJobQueueEnabled(),
    stagingOnly: ref === STAGING_SUPABASE_REF,
    schema,
    schemaVersion: await boss.schemaVersion(),
    installed: await boss.isInstalled(),
    queues: stats
      .filter((q): q is QueueResult => q != null)
      .map((q: QueueResult) => ({
        name: q.name,
        queuedCount: q.queuedCount,
        activeCount: q.activeCount,
        deferredCount: q.deferredCount,
        totalCount: q.totalCount,
      })),
    workers: boss.getWipData().map((w: WipData) => ({
      id: w.id,
      name: w.name,
      state: w.state,
      count: w.count,
    })),
    emailMetrics: readEmailJobMetrics(),
    deadLetterQueue: DLQ_QUEUE_NAME,
  };
}

/** Oldest pending job age estimate from queue deferred + queued counts (foundation metric). */
export function summarizeQueueDepth(snapshot: QueueHealthSnapshot): {
  totalQueued: number;
  totalActive: number;
  totalDeferred: number;
} {
  let totalQueued = 0;
  let totalActive = 0;
  let totalDeferred = 0;
  for (const q of snapshot.queues) {
    totalQueued += q.queuedCount;
    totalActive += q.activeCount;
    totalDeferred += q.deferredCount;
  }
  return { totalQueued, totalActive, totalDeferred };
}
