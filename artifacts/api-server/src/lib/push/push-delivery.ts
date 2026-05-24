import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, notificationPreferencesTable } from "@workspace/db";
import { logger } from "../logger";
import { shouldDeliverPushNotification } from "../notification-preference-gate";
import { isWithinQuietHours } from "./quiet-hours";
import { notificationDeepLinkPath } from "./notification-url";
import {
  listActivePushSubscriptions,
  revokePushSubscriptionByEndpoint,
} from "./push-subscriptions";
import { getVapidConfig, isPushConfigured } from "./vapid-config";
import type { PushDeliveryJob } from "./push-queue";

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
  if (!allowed) return;

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
    return;
  }

  const subs = await listActivePushSubscriptions(job.userId);
  if (!subs.length) return;

  const url = notificationDeepLinkPath({
    type: job.type,
    entityType: job.entityType,
    entityId: job.entityId,
    metadata: job.metadata ?? null,
  });

  const payload = JSON.stringify({
    title: job.title,
    body: job.body,
    data: {
      url,
      notificationId: job.notificationId,
      type: job.type,
    },
  });

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
