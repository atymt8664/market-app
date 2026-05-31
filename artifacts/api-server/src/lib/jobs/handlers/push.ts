import type { Job } from "pg-boss";
import { STAGING_SUPABASE_REF } from "../constants";
import { detectSupabaseProjectRef } from "../env-guard";
import type { PushDeliverJobPayload } from "../push-types";
import { incrementPushJobMetric } from "../job-queue-metrics";
import { PUSH_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";
import { executePushDelivery } from "../../push/schedule-push-delivery";

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

async function handlePushDeliver(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope<PushDeliverJobPayload>(job.data);
    const payload = envelope.payload;
    if (
      !Number.isInteger(payload.userId) ||
      payload.userId <= 0 ||
      !Number.isInteger(payload.notificationId) ||
      payload.notificationId <= 0 ||
      !payload.type?.trim() ||
      !payload.title?.trim()
    ) {
      throw new Error("push.deliver payload invalid");
    }

    if (isStagingDryRun(payload)) {
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          kind: "push_deliver_dry_run",
          userId: payload.userId,
          notificationId: payload.notificationId,
        },
        "P15 push job dry run (STAGING smoke)",
      );
      incrementPushJobMetric("processed");
      continue;
    }

    try {
      await executePushDelivery({
        userId: payload.userId,
        notificationId: payload.notificationId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType,
        entityId: payload.entityId,
        metadata: payload.metadata,
      });
      incrementPushJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          kind: "push_deliver_processed",
          userId: payload.userId,
          notificationId: payload.notificationId,
          type: payload.type,
        },
        "P15 push job processed: push.deliver",
      );
    } catch (err) {
      incrementPushJobMetric("failed");
      throw err;
    }
  }
}

/** Register P15-3C push delivery handler. */
export function registerPushJobHandlers(): void {
  registerJobHandler({
    name: PUSH_JOB_TYPES.DELIVER,
    handler: handlePushDeliver,
  });
}
