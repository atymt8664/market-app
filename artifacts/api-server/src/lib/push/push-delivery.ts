import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, notificationPreferencesTable } from "@workspace/db";
import { logger } from "../logger";
import { shouldDeliverPushNotification } from "../notification-preference-gate";
import { isWithinQuietHours } from "./quiet-hours";
import {
  listActivePushSubscriptions,
  revokePushSubscriptionByEndpoint,
} from "./push-subscriptions";
import { getVapidConfig, isPushConfigured } from "./vapid-config";
import type { PushDeliveryJob } from "./push-queue";
import { buildPushNotificationPayload } from "./payload-contract";
let vapidApplied = false;

function ensureVapid(): boolean {
  if (vapidApplied) return isPushConfigured();
  const cfg = getVapidConfig();
  if (!cfg) return false;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  vapidApplied = true;
  return true;
}

export async function deliverPushJob(job: PushDeliveryJob): Promise<void> {
  if (!ensureVapid()) return;

  const allowed = await shouldDeliverPushNotification(job.userId, job.type);
  if (!allowed) {
    logger.info(
      {
        kind: "push_skipped_preferences",
        userId: job.userId,
        notificationId: job.notificationId,
        type: job.type,
      },
      "push skipped: user preferences",
    );
    return;
  }

  const [prefRow] = await db
    .select({
      quietHoursEnabled: notificationPreferencesTable.quietHoursEnabled,
      quietHoursStart: notificationPreferencesTable.quietHoursStart,
      quietHoursEnd: notificationPreferencesTable.quietHoursEnd,
      quietHoursTimezone: notificationPreferencesTable.quietHoursTimezone,
    })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, job.userId))
    .limit(1);

  if (
    prefRow?.quietHoursEnabled &&
    isWithinQuietHours(
      new Date(),
      prefRow.quietHoursStart,
      prefRow.quietHoursEnd,
      prefRow.quietHoursTimezone,
    )
  ) {
    logger.info(
      {
        kind: "push_skipped_quiet_hours",
        userId: job.userId,
        notificationId: job.notificationId,
      },
      "push skipped: quiet hours",
    );
    return;
  }

  const subs = await listActivePushSubscriptions(job.userId);
  if (!subs.length) {
    logger.info(
      {
        kind: "push_skipped_no_subscription",
        userId: job.userId,
        notificationId: job.notificationId,
        type: job.type,
      },
      "push skipped: no active push subscription",
    );
    return;
  }

  const payload = JSON.stringify(buildPushNotificationPayload(job));

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        logger.info(
          {
            kind: "push_delivered",
            userId: job.userId,
            notificationId: job.notificationId,
            subscriptionId: sub.id,
          },
          "push sent via web-push",
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await revokePushSubscriptionByEndpoint(sub.endpoint);
          return;
        }
        logger.warn(
          {
            errMessage: err instanceof Error ? err.message : String(err),
            userId: job.userId,
            status,
          },
          "push delivery failed",
        );
      }
    }),
  );
}
