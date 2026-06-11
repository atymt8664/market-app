import type {
  NotificationCategory,
  NotificationDomain,
  NotificationPriority,
} from "./types";

type TypeRule = {
  domain: NotificationDomain;
  category: NotificationCategory;
  priority: NotificationPriority;
};

const PREFIX_RULES: Array<{ prefix: string; rule: TypeRule }> = [
  { prefix: "security.", rule: { domain: "security", category: "security", priority: 0 } },
  { prefix: "trust.", rule: { domain: "trust", category: "trust_safety", priority: 0 } },
  { prefix: "verification.", rule: { domain: "verification", category: "trust_safety", priority: 1 } },
  { prefix: "user.avatar", rule: { domain: "trust", category: "trust_safety", priority: 2 } },
  { prefix: "order.", rule: { domain: "orders", category: "orders", priority: 1 } },
  { prefix: "message.", rule: { domain: "messages", category: "messages", priority: 1 } },
  { prefix: "chat.", rule: { domain: "messages", category: "messages", priority: 1 } },
  { prefix: "support.", rule: { domain: "support", category: "support", priority: 1 } },
  { prefix: "report.", rule: { domain: "reports", category: "reports", priority: 2 } },
  { prefix: "ad.favorited", rule: { domain: "social", category: "social", priority: 3 } },
  { prefix: "ad.", rule: { domain: "marketplace", category: "marketplace", priority: 1 } },
  { prefix: "social.", rule: { domain: "social", category: "social", priority: 3 } },
  { prefix: "announcement.", rule: { domain: "admin", category: "admin", priority: 1 } },
  { prefix: "admin.", rule: { domain: "admin", category: "admin", priority: 2 } },
  { prefix: "system.", rule: { domain: "system", category: "system", priority: 2 } },
];

const DEFAULT_RULE: TypeRule = {
  domain: "system",
  category: "system",
  priority: 2,
};

export function normalizeNotificationType(type: string): string {
  return type.trim().toLowerCase().slice(0, 80);
}

export function resolveTypeRule(type: string): TypeRule {
  const n = normalizeNotificationType(type);
  for (const { prefix, rule } of PREFIX_RULES) {
    if (n.startsWith(prefix)) return rule;
  }
  return DEFAULT_RULE;
}

export function resolveNotificationDomain(type: string): NotificationDomain {
  return resolveTypeRule(type).domain;
}

export function resolveNotificationCategory(type: string): NotificationCategory {
  return resolveTypeRule(type).category;
}

export function resolveNotificationPriority(type: string): NotificationPriority {
  return resolveTypeRule(type).priority;
}

/** Maps notification type to existing preference column (P6). */
export type NotificationPreferenceColumn =
  | "notifyMessages"
  | "notifyAdModeration"
  | "notifySupport"
  | "notifyReports"
  | "notifyAnnouncements"
  | "notifyFavorites"
  | null;

export function resolvePreferenceColumnForType(
  notificationType: string,
): NotificationPreferenceColumn {
  const n = normalizeNotificationType(notificationType);
  if (n.startsWith("ad.favorited") || n.startsWith("favorite.")) return "notifyFavorites";
  if (n.startsWith("ad.")) return "notifyAdModeration";
  if (n.startsWith("support.")) return "notifySupport";
  if (n.startsWith("report.")) return "notifyReports";
  if (n.startsWith("message.") || n.startsWith("chat.")) return "notifyMessages";
  if (n.startsWith("announcement.") || n.startsWith("admin.")) return "notifyAnnouncements";
  // security.* / trust.* / order.* — no pref column yet (P17-9-2); default allow in gate
  return null;
}
