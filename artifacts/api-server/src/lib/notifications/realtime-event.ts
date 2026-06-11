import type { NotificationRow } from "@workspace/db";
import { toNotificationApiRow, type NotificationApiRow } from "./contract";

/** WebSocket event name — isolated from chat `message` / `typing`. */
export const NOTIFICATION_REALTIME_EVENT = "notification.created" as const;

export type NotificationRealtimeWsEvent = {
  type: typeof NOTIFICATION_REALTIME_EVENT;
  notification: NotificationApiRow;
};

export function buildNotificationRealtimeWsEvent(
  row: NotificationRow,
): NotificationRealtimeWsEvent {
  return {
    type: NOTIFICATION_REALTIME_EVENT,
    notification: toNotificationApiRow(row),
  };
}

/** True only for a newly inserted row — skip dedup conflicts (P17-9-2). */
export function shouldEmitNotificationRealtime(isNewInsert: boolean): boolean {
  return isNewInsert;
}
