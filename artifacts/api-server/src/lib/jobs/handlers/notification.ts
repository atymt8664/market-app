import type { Job } from "pg-boss";
import { STAGING_SUPABASE_REF } from "../constants";
import { detectSupabaseProjectRef } from "../env-guard";
import type { InAppNotificationJobPayload } from "../notification-types";
import { incrementNotificationJobMetric } from "../job-queue-metrics";
import { NOTIFICATION_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";
import { executeInsertInAppNotification } from "../../notification-persist";

function parseEnvelope<T>(data: unknown): JobEnvelope<T> {
  if (!data || typeof data !== "object") {
    throw new Error("invalid job envelope");
  }
  const envelope = data as JobEnvelope<T>;
  if (envelope.v !== 1 || !envelope.payload) {
    throw new Error("unsupported job envelope version");
  }
  return envelope;
}

function isStagingDryRun(payload: { dryRun?: boolean }): boolean {
  return (
    payload.dryRun === true &&
    detectSupabaseProjectRef() === STAGING_SUPABASE_REF
  );
}

async function handleInAppNotification(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope<InAppNotificationJobPayload>(job.data);
    const payload = envelope.payload;
    if (
      !Number.isInteger(payload.userId) ||
      payload.userId <= 0 ||
      !payload.type?.trim() ||
      !payload.title?.trim()
    ) {
      throw new Error("notify.in_app payload invalid");
    }

    if (isStagingDryRun(payload)) {
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          kind: "notify_in_app_dry_run",
          userId: payload.userId,
          type: payload.type,
        },
        "P15 notification job dry run (STAGING smoke)",
      );
      incrementNotificationJobMetric("processed");
      continue;
    }

    try {
      const notificationId = await executeInsertInAppNotification({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType,
        entityId: payload.entityId,
        metadata: payload.metadata,
        foundation: payload.foundation,
      });
      incrementNotificationJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          kind: "notify_in_app_inserted",
          notificationId,
          userId: payload.userId,
          type: payload.type,
        },
        "P15 notification job processed: notify.in_app",
      );
    } catch (err) {
      incrementNotificationJobMetric("failed");
      throw err;
    }
  }
}

/** Register P15-3B in-app notification handler. */
export function registerNotificationJobHandlers(): void {
  registerJobHandler({
    name: NOTIFICATION_JOB_TYPES.IN_APP,
    handler: handleInAppNotification,
  });
}
