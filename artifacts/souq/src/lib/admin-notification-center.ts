import type {
  AdminNotificationCategory,
  AdminNotificationPriorityLabel,
  AdminNotificationRow,
} from "@/features/admin/api/notifications";

export type AdminNotificationTabId = "all" | AdminNotificationCategory | "unread";

export const ADMIN_NOTIFICATION_CATEGORIES: AdminNotificationCategory[] = [
  "moderation",
  "reports",
  "support",
  "verification",
  "operations",
  "security",
  "system",
];

export type AdminNotificationSummary = {
  total: number;
  unread: number;
  critical: number;
  byCategory: Record<AdminNotificationCategory, number>;
};

export function computeAdminNotificationSummary(
  items: AdminNotificationRow[],
): AdminNotificationSummary {
  const byCategory = Object.fromEntries(
    ADMIN_NOTIFICATION_CATEGORIES.map((c) => [c, 0]),
  ) as Record<AdminNotificationCategory, number>;
  let unread = 0;
  let critical = 0;
  for (const item of items) {
    if (!item.readAt) {
      unread += 1;
      if (item.priority === 0) critical += 1;
    }
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  }
  return { total: items.length, unread, critical, byCategory };
}

export function filterAdminNotificationsByTab(
  items: AdminNotificationRow[],
  tab: AdminNotificationTabId,
): AdminNotificationRow[] {
  if (tab === "all") return items;
  if (tab === "unread") return items.filter((n) => !n.readAt);
  return items.filter((n) => n.category === tab);
}

export function adminNotificationTabs(
  items: AdminNotificationRow[],
): Array<{ id: AdminNotificationTabId; count: number }> {
  const summary = computeAdminNotificationSummary(items);
  const tabs: Array<{ id: AdminNotificationTabId; count: number }> = [
    { id: "all", count: summary.total },
    { id: "unread", count: summary.unread },
  ];
  for (const category of ADMIN_NOTIFICATION_CATEGORIES) {
    const count = summary.byCategory[category];
    if (count > 0) tabs.push({ id: category, count });
  }
  return tabs;
}

export function adminPriorityTone(
  label: AdminNotificationPriorityLabel,
): "critical" | "high" | "medium" | "low" {
  return label;
}

export function adminCategoryI18nKey(category: AdminNotificationCategory): string {
  return `p8.admin.notifications.category.${category}`;
}

export function adminPriorityI18nKey(label: AdminNotificationPriorityLabel): string {
  return `p8.admin.notifications.priority.${label}`;
}

export function resolveAdminNotificationHref(n: AdminNotificationRow): string {
  const path = n.deepLinkPath?.trim();
  if (path?.startsWith("/admin")) return path;
  return "/admin";
}
