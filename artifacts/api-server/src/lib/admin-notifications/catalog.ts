import type { AdminNotificationCategory, AdminNotificationPriority } from "./types";

type TypeRule = {
  category: AdminNotificationCategory;
  priority: AdminNotificationPriority;
  permission: string | null;
};

const PREFIX_RULES: Array<{ prefix: string; rule: TypeRule }> = [
  { prefix: "admin.security.", rule: { category: "security", priority: 0, permission: "system" } },
  { prefix: "admin.ops.sla", rule: { category: "operations", priority: 0, permission: "dashboard.operations" } },
  { prefix: "admin.ops.", rule: { category: "operations", priority: 1, permission: "dashboard.operations" } },
  { prefix: "admin.report.", rule: { category: "reports", priority: 1, permission: "reports" } },
  { prefix: "admin.support.", rule: { category: "support", priority: 1, permission: "support" } },
  { prefix: "admin.verification.", rule: { category: "verification", priority: 1, permission: "verification" } },
  { prefix: "admin.ad.", rule: { category: "moderation", priority: 1, permission: "ads" } },
  { prefix: "admin.user.", rule: { category: "moderation", priority: 2, permission: "users" } },
  { prefix: "admin.system.", rule: { category: "system", priority: 2, permission: "dashboard.operations" } },
];

const DEFAULT_RULE: TypeRule = {
  category: "system",
  priority: 2,
  permission: "dashboard.operations",
};

export function normalizeAdminNotificationType(type: string): string {
  return type.trim().toLowerCase().slice(0, 80);
}

export function resolveAdminTypeRule(type: string): TypeRule {
  const n = normalizeAdminNotificationType(type);
  for (const { prefix, rule } of PREFIX_RULES) {
    if (n.startsWith(prefix)) return rule;
  }
  return DEFAULT_RULE;
}

export function priorityLabel(
  priority: AdminNotificationPriority,
): "critical" | "high" | "medium" | "low" {
  if (priority === 0) return "critical";
  if (priority === 1) return "high";
  if (priority === 2) return "medium";
  return "low";
}

export const ADMIN_NOTIFICATION_CATEGORY_VALUES = [
  "moderation",
  "reports",
  "support",
  "verification",
  "operations",
  "security",
  "system",
] as const satisfies readonly AdminNotificationCategory[];
