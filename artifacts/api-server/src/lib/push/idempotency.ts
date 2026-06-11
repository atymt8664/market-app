import type { PushDeliveryJob } from "./push-queue";

/**
 * pg-boss idempotency key — prefers notification dedup_key (P17-9-2).
 */
export function buildPushJobIdempotencyKey(job: PushDeliveryJob): string {
  const dedup = job.dedupKey?.trim();
  if (dedup) return `push.deliver:dedup:${job.userId}:${dedup}`;
  return `push.deliver:${job.userId}:${job.notificationId}`;
}
