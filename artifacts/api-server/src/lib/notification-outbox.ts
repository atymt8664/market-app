import { logger } from "./logger";
import { buildInAppJobIdempotencyKey } from "./notifications/idempotency";
import {
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { STAGING_SUPABASE_REF } from "./jobs/constants";
import { enqueueInAppNotification } from "./jobs/enqueue";
import { startQueueModule } from "./jobs/queue-module";
import { incrementNotificationJobMetric } from "./jobs/job-queue-metrics";
import type { PreparedInAppNotification } from "./jobs/notification-types";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/**
 * P15-3B: notification outbox on STAGING when queue + outbox flags are set.
 * PRODUCTION keeps synchronous DB insert (no behavior change).
 */
export function isNotificationOutboxEnabled(): boolean {
  if (!isJobQueueEnabled()) return false;
  if (!isTrue(process.env["NOTIFICATION_OUTBOX_ENABLED"] ?? "1")) return false;
  return detectSupabaseProjectRef() === STAGING_SUPABASE_REF;
}

/** Enqueue or reject — caller validates input and preferences first. */
export async function dispatchInAppNotification(
  input: PreparedInAppNotification,
): Promise<void> {
  if (!isNotificationOutboxEnabled()) {
    throw new Error(
      "dispatchInAppNotification called without outbox enabled — use executeInsertInAppNotification",
    );
  }

  const boss = await startQueueModule();
  const idempotencyKey = buildInAppJobIdempotencyKey(input);
  const jobId = await enqueueInAppNotification(boss, input, { idempotencyKey });
  if (!jobId) {
    throw new Error("Failed to enqueue notify.in_app job");
  }
  incrementNotificationJobMetric("enqueued");
  logger.info(
    {
      kind: "notification_outbox_enqueued",
      jobName: "notify.in_app",
      jobId,
      userId: input.userId,
      type: input.type,
    },
    "In-app notification enqueued",
  );
}
