import "./load-env";
import { logger } from "./lib/logger";
import { deliverPushJob } from "./lib/push/push-delivery";
import {
  blockingPopPushDeliveryJob,
  closePushRedisClient,
  isPushQueueAvailable,
} from "./lib/push/push-queue";
import { isPushConfigured } from "./lib/push/vapid-config";

async function runWorkerLoop(): Promise<void> {
  if (!isPushConfigured()) {
    logger.error("Push worker: VAPID not configured");
    process.exit(1);
  }
  if (!isPushQueueAvailable()) {
    logger.error("Push worker: REDIS_URL not configured");
    process.exit(1);
  }

  logger.info("Push worker started");

  for (;;) {
    const job = await blockingPopPushDeliveryJob(5);
    if (!job) continue;
    try {
      await deliverPushJob(job);
    } catch (err) {
      logger.warn({ err, userId: job.userId }, "push worker job failed");
    }
  }
}

function registerShutdown(): void {
  const stop = () => {
    void closePushRedisClient().finally(() => process.exit(0));
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}

registerShutdown();
void runWorkerLoop();
