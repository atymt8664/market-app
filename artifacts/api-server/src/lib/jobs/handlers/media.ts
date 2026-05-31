import type { Job } from "pg-boss";
import { executeAccountStoragePurge } from "../../account-deletion";
import { STAGING_SUPABASE_REF } from "../constants";
import { detectSupabaseProjectRef } from "../env-guard";
import {
  incrementMediaJobMetric,
  recordMediaPurgeResult,
} from "../job-queue-metrics";
import type { MediaPurgePayload } from "../media-types";
import { MEDIA_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";

function parseEnvelope(data: unknown): JobEnvelope<MediaPurgePayload> {
  if (!data || typeof data !== "object") {
    throw new Error("invalid job envelope");
  }
  const envelope = data as JobEnvelope<MediaPurgePayload>;
  if (envelope.v !== 1 || !envelope.payload) {
    throw new Error("unsupported job envelope version");
  }
  return envelope;
}

function isStagingDryRun(payload: MediaPurgePayload): boolean {
  return (
    payload.dryRun === true &&
    detectSupabaseProjectRef() === STAGING_SUPABASE_REF
  );
}

async function handleMediaPurge(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope(job.data);
    const { userId, paths, trigger } = envelope.payload;

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("media.purge payload missing valid userId");
    }

    if (isStagingDryRun(envelope.payload)) {
      recordMediaPurgeResult({ userId, pathsRemoved: paths.length });
      incrementMediaJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          trigger,
          userId,
          pathCount: paths.length,
          kind: "media_purge_dry_run",
        },
        "P15 media purge job dry run (STAGING smoke)",
      );
      continue;
    }

    try {
      await executeAccountStoragePurge(paths);
      recordMediaPurgeResult({ userId, pathsRemoved: paths.length });
      incrementMediaJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          trigger,
          userId,
          pathCount: paths.length,
          kind: "media_purge_completed",
        },
        "P15 media purge job processed: media.purge",
      );
    } catch (err) {
      incrementMediaJobMetric("failed");
      throw err;
    }
  }
}

/** Register P15-3G media purge handlers. */
export function registerMediaJobHandlers(): void {
  registerJobHandler({
    name: MEDIA_JOB_TYPES.PURGE,
    handler: handleMediaPurge,
  });
}
