import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { broadcastToUser } from "../realtime";
import { logger } from "../logger";
import {
  buildNotificationRealtimeWsEvent,
  NOTIFICATION_REALTIME_EVENT,
} from "./realtime-event";

export {
  NOTIFICATION_REALTIME_EVENT,
  buildNotificationRealtimeWsEvent,
  shouldEmitNotificationRealtime,
} from "./realtime-event";
export type { NotificationRealtimeWsEvent } from "./realtime-event";

/**
 * Push in-app notification to all open WebSocket sessions for the user.
 * No-op when user is offline — polling remains fallback (P17-9-5).
 */
export async function broadcastNotificationCreated(
  userId: number,
  notificationId: number,
): Promise<void> {
  if (!Number.isInteger(userId) || userId <= 0) return;
  if (!Number.isInteger(notificationId) || notificationId <= 0) return;

  try {
    const [row] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId))
      .limit(1);

    if (!row || row.userId !== userId) return;

    broadcastToUser(userId, buildNotificationRealtimeWsEvent(row));
  } catch (err) {
    logger.warn(
      { err, userId, notificationId, kind: "notification_realtime_broadcast_failed" },
      "notification realtime broadcast failed",
    );
  }
}
