import { logger } from "./logger";
import {
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { STAGING_SUPABASE_REF } from "./jobs/constants";
import { enqueueMediaPurge } from "./jobs/enqueue";
import { startQueueModule } from "./jobs/queue-module";
import { incrementMediaJobMetric } from "./jobs/job-queue-metrics";
import {
  executeAccountStoragePurge,
  runBestEffortStorageCleanupForUser,
} from "./account-deletion";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/**
 * P15-3G: storage purge outbox on STAGING when queue + purge flags are set.
 * PRODUCTION keeps synchronous best-effort cleanup after DB delete.
 */
export function isPurgeOutboxEnabled(): boolean {
  if (!isJobQueueEnabled()) return false;
  if (!isTrue(process.env["PURGE_OUTBOX_ENABLED"] ?? "1")) return false;
  return detectSupabaseProjectRef() === STAGING_SUPABASE_REF;
}

/** Route account-deletion storage purge: STAGING pg-boss job or sync fallback. */
export async function routeAccountDeletionStoragePurge(
  userId: number,
  paths: string[],
): Promise<void> {
  if (!isPurgeOutboxEnabled()) {
    await runBestEffortStorageCleanupForUser(userId, paths);
    return;
  }

  const boss = await startQueueModule();
  const idempotencyKey = `media.purge:account:${userId}`;
  try {
    const jobId = await enqueueMediaPurge(
      boss,
      {
        userId,
        paths,
        trigger: "account_deletion",
      },
      { idempotencyKey },
    );
    if (!jobId) {
      throw new Error("Failed to enqueue media.purge job");
    }
    incrementMediaJobMetric("enqueued");
    logger.info(
      {
        kind: "purge_outbox_enqueued",
        jobName: "media.purge",
        jobId,
        userId,
        pathCount: paths.length,
      },
      "Account deletion storage purge enqueued",
    );
  } catch (err) {
    logger.warn(
      { err, userId, pathCount: paths.length },
      "purge outbox enqueue failed — sync fallback",
    );
    await runBestEffortStorageCleanupForUser(userId, paths);
  }
}

/** @internal test hook — sync purge without queue. */
export async function executeAccountStoragePurgeSync(
  userId: number,
  paths: string[],
): Promise<void> {
  await runBestEffortStorageCleanupForUser(userId, paths);
}

export { executeAccountStoragePurge };
