import { and, eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { routePushDeliveryAfterNotification } from "./push-outbox";
import type { PreparedInAppNotification } from "./jobs/notification-types";
import { buildNotificationInsertValues } from "./notifications/insert-values";
import { buildPushDeliveryJob } from "./push/build-delivery-job";
import {
  broadcastNotificationCreated,
  shouldEmitNotificationRealtime,
} from "./notifications/realtime";

async function findNotificationIdByDedupKey(
  userId: number,
  dedupKey: string,
): Promise<number | null> {
  const [row] = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.dedupKey, dedupKey),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

async function routePushAfterNewNotification(
  input: PreparedInAppNotification,
  notificationId: number,
): Promise<void> {
  await routePushDeliveryAfterNotification(
    buildPushDeliveryJob(input, notificationId),
  );
}

/**
 * Inserts in-app notification row and routes push fan-out (P15-3C outbox or legacy).
 * P17-9-2: persists foundation fields; dedup_key conflicts return existing id without re-push.
 */
export async function executeInsertInAppNotification(
  input: PreparedInAppNotification,
): Promise<number> {
  const values = buildNotificationInsertValues(input);
  const dedupKey = values.dedupKey?.trim() || null;

  if (dedupKey) {
    // P17-9-7: partial unique index (WHERE dedup_key IS NOT NULL) is not compatible
    // with Drizzle onConflictDoNothing on (user_id, dedup_key) — use lookup + plain insert.
    const existingId = await findNotificationIdByDedupKey(input.userId, dedupKey);
    if (existingId != null) return existingId;

    try {
      const [inserted] = await db
        .insert(notificationsTable)
        .values({ ...values, dedupKey })
        .returning({ id: notificationsTable.id });

      const notificationId = inserted?.id;
      if (notificationId == null) {
        throw new Error("notification insert returned no id");
      }

      await routePushAfterNewNotification(input, notificationId);
      if (shouldEmitNotificationRealtime(true)) {
        void broadcastNotificationCreated(input.userId, notificationId);
      }
      return notificationId;
    } catch (err) {
      const raced = await findNotificationIdByDedupKey(input.userId, dedupKey);
      if (raced != null) return raced;
      throw err;
    }
  }

  const [row] = await db
    .insert(notificationsTable)
    .values(values)
    .returning({ id: notificationsTable.id });

  const notificationId = row?.id;
  if (notificationId == null) {
    throw new Error("notification insert returned no id");
  }

  await routePushAfterNewNotification(input, notificationId);

  if (shouldEmitNotificationRealtime(true)) {
    void broadcastNotificationCreated(input.userId, notificationId);
  }

  return notificationId;
}
