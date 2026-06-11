import type { AppNotification } from "@/lib/notifications-api";

export const NOTIFICATION_REALTIME_EVENT = "notification.created" as const;

export type NotificationCreatedEvent = {
  type: typeof NOTIFICATION_REALTIME_EVENT;
  notification: AppNotification & {
    category: string;
    domain: string;
    priority: number;
    dedupKey: string | null;
    aggregationKey: string | null;
    deepLinkPath: string;
  };
};

export function isNotificationCreatedEvent(
  value: unknown,
): value is NotificationCreatedEvent {
  if (!value || typeof value !== "object") return false;
  const v = value as { type?: unknown; notification?: unknown };
  if (v.type !== NOTIFICATION_REALTIME_EVENT) return false;
  if (!v.notification || typeof v.notification !== "object") return false;
  const n = v.notification as { id?: unknown };
  return Number.isInteger(n.id) && Number(n.id) > 0;
}
