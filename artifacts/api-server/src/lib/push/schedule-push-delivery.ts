import { logger } from "../logger";
import { deliverPushJob } from "./push-delivery";
import { enqueuePushDeliveryJob, type PushDeliveryJob } from "./push-queue";
import { isPushConfigured } from "./vapid-config";

/**
 * Awaitable push fan-out (Redis LIST or inline deliverPushJob).
 * Used by pg-boss worker (P15-3C) and schedulePushDelivery (PRODUCTION / fallback).
 */
export async function executePushDelivery(job: PushDeliveryJob): Promise<void> {
  if (!isPushConfigured()) return;

  const queued = await enqueuePushDeliveryJob(job);
  if (!queued) {
    await deliverPushJob(job);
  }
}

/** Fire-and-forget push fan-out after in-app notification insert. */
export function schedulePushDelivery(job: PushDeliveryJob): void {
  void executePushDelivery(job).catch((err) => {
    logger.warn(
      { err, userId: job.userId, notificationId: job.notificationId },
      "schedulePushDelivery failed",
    );
  });
}
