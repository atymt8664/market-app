import type { AppNotification } from "@/lib/notifications-api";

/** User-facing tabs — maps Architecture Lock categories (P17-9-2 contract). */
export const NOTIFICATION_CENTER_TAB_IDS = [
  "all",
  "unread",
  "messages",
  "marketplace",
  "orders",
  "support",
  "social",
  "reports",
  "security",
  "updates",
] as const;

export type NotificationCenterTabId = (typeof NOTIFICATION_CENTER_TAB_IDS)[number];

export type NotificationCategory =
  | "messages"
  | "marketplace"
  | "orders"
  | "support"
  | "reports"
  | "trust_safety"
  | "security"
  | "admin"
  | "system"
  | "social";

const CATEGORY_ALIASES: Record<string, NotificationCategory> = {
  messages: "messages",
  marketplace: "marketplace",
  orders: "orders",
  support: "support",
  reports: "reports",
  trust_safety: "trust_safety",
  security: "security",
  admin: "admin",
  system: "system",
  social: "social",
};

const TAB_CATEGORY_MAP: Record<
  Exclude<NotificationCenterTabId, "all" | "unread">,
  readonly NotificationCategory[]
> = {
  messages: ["messages"],
  marketplace: ["marketplace"],
  orders: ["orders"],
  support: ["support"],
  social: ["social"],
  reports: ["reports"],
  security: ["trust_safety", "security"],
  updates: ["admin", "system"],
};

export function normalizeNotificationCategory(
  n: Pick<AppNotification, "category" | "type">,
): NotificationCategory {
  const raw = (n.category ?? "").trim().toLowerCase();
  if (raw in CATEGORY_ALIASES) return CATEGORY_ALIASES[raw]!;
  const type = (n.type ?? "").trim().toLowerCase();
  if (type.startsWith("message.") || type.startsWith("chat.")) return "messages";
  if (type.startsWith("order.")) return "orders";
  if (type.startsWith("ad.")) return "marketplace";
  if (type.startsWith("support.")) return "support";
  if (type.startsWith("report.")) return "reports";
  if (type.startsWith("security.") || type.startsWith("trust.")) return "security";
  if (type.startsWith("announcement.") || type.startsWith("admin.")) return "admin";
  if (type.startsWith("social.") || type.startsWith("ad.favorited")) return "social";
  return "system";
}

export function filterNotificationsByTab(
  items: AppNotification[],
  tab: NotificationCenterTabId,
): AppNotification[] {
  if (tab === "all") return items;
  if (tab === "unread") return items.filter((n) => !n.readAt);
  const categories = TAB_CATEGORY_MAP[tab];
  return items.filter((n) => categories.includes(normalizeNotificationCategory(n)));
}

export function countUnreadInTab(
  items: AppNotification[],
  tab: NotificationCenterTabId,
): number {
  return filterNotificationsByTab(items, tab).filter((n) => !n.readAt).length;
}

export function visibleNotificationTabs(
  items: AppNotification[],
): NotificationCenterTabId[] {
  const tabs: NotificationCenterTabId[] = ["all", "unread"];
  for (const tab of NOTIFICATION_CENTER_TAB_IDS) {
    if (tab === "all" || tab === "unread") continue;
    if (filterNotificationsByTab(items, tab).length > 0) tabs.push(tab);
  }
  return tabs;
}

/** Prefer server-resolved deep link (P17-9 foundation); fallback for legacy rows. */
export function resolveNotificationHref(n: AppNotification): string | null {
  const path = n.deepLinkPath?.trim();
  if (path && path.startsWith("/") && path !== "/notifications") return path;

  const et = n.entityType?.trim().toLowerCase() ?? "";
  const id = typeof n.entityId === "number" ? n.entityId : Number(n.entityId);
  if (!et || !Number.isFinite(id) || id <= 0) return null;
  if (et === "ad") return `/ad/${id}`;
  if (et === "conversation") return `/messages/${id}`;
  if (et === "support_ticket") return `/account/help?ticket=${id}`;
  if (et === "order") {
    const meta = n.metadata ?? {};
    const orderNumber = meta.order_number ?? meta.orderNumber;
    if (typeof orderNumber === "string" && orderNumber.trim()) {
      const role = String(meta.role ?? meta.orderRole ?? "").toLowerCase();
      if (role === "seller") return `/seller-orders/${encodeURIComponent(orderNumber.trim())}`;
      return `/orders/${encodeURIComponent(orderNumber.trim())}`;
    }
  }
  return null;
}

export function tabI18nKey(tab: NotificationCenterTabId): string {
  return `notifications.tabs.${tab}`;
}

export function categoryI18nKey(category: NotificationCategory): string {
  return `notifications.category.${category}`;
}
