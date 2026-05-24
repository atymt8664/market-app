import { logger } from "../logger";
import { deliverPushJob } from "./push-delivery";
import { enqueuePushDeliveryJob, type PushDeliveryJob } from "./push-queue";
import { isPushConfigured } from "./vapid-config";

/** Fire-and-forget push fan-out after in-app notification insert. */
export function schedulePushDelivery(job: PushDeliveryJob): void {
  if (!isPushConfigured()) return;

  void (async () => {
    try {
      const queued = await enqueuePushDeliveryJob(job);
      if (!queued) {
        await deliverPushJob(job);
      }
    } catch (err) {
      logger.warn(
        { err, userId: job.userId, notificationId: job.notificationId },
        "schedulePushDelivery failed",
      );
    }
  })();
}
