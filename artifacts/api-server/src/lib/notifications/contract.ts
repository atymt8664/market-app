import type { NotificationRow } from "@workspace/db";
import type {
  NotificationCategory,
  NotificationDomain,
  NotificationPriority,
} from "./types";
import { notificationDeepLinkPath } from "./deep-link";

/** API + DB contract — keep in sync with migration 023_p17_9_2. */
export const NOTIFICATION_CATEGORY_VALUES = [
  "messages",
  "marketplace",
  "orders",
  "support",
  "reports",
  "trust_safety",
  "security",
  "admin",
  "system",
  "social",
] as const satisfies readonly NotificationCategory[];

export const NOTIFICATION_DOMAIN_VALUES = [
  "messages",
  "marketplace",
  "orders",
  "support",
  "reports",
  "trust",
  "security",
  "admin",
  "system",
  "social",
  "verification",
] as const satisfies readonly NotificationDomain[];

export const NOTIFICATION_PRIORITY_VALUES = [0, 1, 2, 3] as const satisfies readonly NotificationPriority[];

export type NotificationApiRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  category: NotificationCategory;
  domain: NotificationDomain;
  priority: NotificationPriority;
  dedupKey: string | null;
  aggregationKey: string | null;
  deepLinkPath: string;
  readAt: string | null;
  createdAt: string;
};

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function isNotificationDomain(value: string): value is NotificationDomain {
  return (NOTIFICATION_DOMAIN_VALUES as readonly string[]).includes(value);
}

export function isNotificationPriority(value: number): value is NotificationPriority {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

export function toNotificationApiRow(row: NotificationRow): NotificationApiRow {
  const categoryRaw = row.category ?? "system";
  const domainRaw = row.domain ?? "system";
  const priorityRaw = Number(row.priority ?? 2);

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    category: isNotificationCategory(categoryRaw) ? categoryRaw : "system",
    domain: isNotificationDomain(domainRaw) ? domainRaw : "system",
    priority: isNotificationPriority(priorityRaw) ? priorityRaw : 2,
    dedupKey: row.dedupKey ?? null,
    aggregationKey: row.aggregationKey ?? null,
    deepLinkPath: notificationDeepLinkPath({
      type: row.type,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata as Record<string, unknown> | null,
    }),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
