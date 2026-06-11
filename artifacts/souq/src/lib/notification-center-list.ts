import type { AppNotification } from "@/lib/notifications-api";

const readAtNow = () => new Date().toISOString();

export function markNotificationReadInList(
  items: AppNotification[],
  id: number,
): { next: AppNotification[]; wasUnread: boolean } {
  let wasUnread = false;
  const next = items.map((n) => {
    if (n.id !== id) return n;
    if (!n.readAt) wasUnread = true;
    return { ...n, readAt: n.readAt ?? readAtNow() };
  });
  return { next, wasUnread };
}

export function markAllNotificationsReadInList(
  items: AppNotification[],
): { next: AppNotification[]; cleared: number } {
  let cleared = 0;
  const next = items.map((n) => {
    if (n.readAt) return n;
    cleared += 1;
    return { ...n, readAt: readAtNow() };
  });
  return { next, cleared };
}

export function prependNotificationToList(
  items: AppNotification[],
  notification: AppNotification,
): AppNotification[] {
  if (items.some((n) => n.id === notification.id)) return items;
  return [notification, ...items];
}
