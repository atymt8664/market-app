import { isThisWeek, isToday, parseISO, startOfDay, startOfWeek } from "date-fns";
import type { AppNotification } from "@/lib/notifications-api";

export type NotificationCenterSummary = {
  unread: number;
  today: number;
  week: number;
  total: number;
};

export function computeNotificationCenterSummary(
  items: AppNotification[],
  now = new Date(),
): NotificationCenterSummary {
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  let unread = 0;
  let today = 0;
  let week = 0;

  for (const n of items) {
    if (!n.readAt) unread += 1;
    let created: Date;
    try {
      created = parseISO(n.createdAt);
    } catch {
      continue;
    }
    if (created >= dayStart) today += 1;
    if (created >= weekStart) week += 1;
  }

  return { unread, today, week, total: items.length };
}

export function isNotificationFromToday(createdAt: string, now = new Date()): boolean {
  try {
    return isToday(parseISO(createdAt));
  } catch {
    return false;
  }
}

export function isNotificationFromThisWeek(createdAt: string, now = new Date()): boolean {
  try {
    return isThisWeek(parseISO(createdAt), { weekStartsOn: 1 });
  } catch {
    return false;
  }
}
