import { logger } from "./logger";
import {
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { STAGING_SUPABASE_REF } from "./jobs/constants";
import { enqueuePushDeliver } from "./jobs/enqueue";
import { startQueueModule } from "./jobs/queue-module";
import { incrementPushJobMetric } from "./jobs/job-queue-metrics";
import type { PushDeliveryJob } from "./push/push-queue";
import { schedulePushDelivery } from "./push/schedule-push-delivery";
import { buildPushJobIdempotencyKey } from "./push/idempotency";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/**
 * P15-3C: push delivery outbox on STAGING when queue + outbox flags are set.
 * PRODUCTION keeps schedulePushDelivery (no pg-boss push job).
 */
export function isPushOutboxEnabled(): boolean {
  if (!isJobQueueEnabled()) return false;
  if (!isTrue(process.env["PUSH_OUTBOX_ENABLED"] ?? "1")) return false;
  return detectSupabaseProjectRef() === STAGING_SUPABASE_REF;
}

function buildIdempotencyKey(job: PushDeliveryJob): string {
  return buildPushJobIdempotencyKey(job);
}

/** Enqueue push.deliver — caller must have notificationId from insert. */
export async function dispatchPushDelivery(job: PushDeliveryJob): Promise<void> {
  if (!isPushOutboxEnabled()) {
    throw new Error(
      "dispatchPushDelivery called without push outbox enabled — use schedulePushDelivery",
    );
  }

  const boss = await startQueueModule();
  const idempotencyKey = buildIdempotencyKey(job);
  const jobId = await enqueuePushDeliver(boss, job, { idempotencyKey });
  if (!jobId) {
    throw new Error("Failed to enqueue push.deliver job");
  }
  incrementPushJobMetric("enqueued");
  logger.info(
    {
      kind: "push_outbox_enqueued",
      jobName: "push.deliver",
      jobId,
      userId: job.userId,
      notificationId: job.notificationId,
      type: job.type,
    },
    "Push delivery enqueued",
  );
}

/** Route push fan-out: STAGING pg-boss outbox or legacy schedulePushDelivery. */
export async function routePushDeliveryAfterNotification(
  job: PushDeliveryJob,
): Promise<void> {
  if (isPushOutboxEnabled()) {
    await dispatchPushDelivery(job);
    return;
  }
  schedulePushDelivery(job);
}
