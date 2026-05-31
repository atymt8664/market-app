import { db, notificationsTable } from "@workspace/db";
import { routePushDeliveryAfterNotification } from "./push-outbox";
import type { PreparedInAppNotification } from "./jobs/notification-types";

/**
 * Inserts in-app notification row and routes push fan-out (P15-3C outbox or legacy).
 * Used by sync path and notification worker (P15-3B).
 */
export async function executeInsertInAppNotification(
  input: PreparedInAppNotification,
): Promise<number> {
  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? undefined,
    })
    .returning({ id: notificationsTable.id });

  const notificationId = row?.id;
  if (notificationId == null) {
    throw new Error("notification insert returned no id");
  }

  await routePushDeliveryAfterNotification({
    userId: input.userId,
    notificationId,
    type: input.type,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });

  return notificationId;
}
