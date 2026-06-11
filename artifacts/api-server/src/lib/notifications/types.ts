/** P17-9-1/9-2 — notification foundation + contract types. */

/** P0 Critical … P3 Low — matches Architecture Lock priority system. */
export type NotificationPriority = 0 | 1 | 2 | 3;

export type NotificationDomain =
  | "messages"
  | "marketplace"
  | "orders"
  | "support"
  | "reports"
  | "trust"
  | "security"
  | "admin"
  | "system"
  | "social"
  | "verification";

/** In-app notification center tab filter (Architecture Lock). */
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

export type NotificationDeepLinkInput = {
  type: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type NotificationFoundationInput = NotificationDeepLinkInput & {
  userId: number;
  /** Optional explicit dedup key — validated; auto-built when omitted. */
  dedupKey?: string | null;
};

export type NotificationFoundationFields = {
  domain: NotificationDomain;
  category: NotificationCategory;
  priority: NotificationPriority;
  dedupKey: string | null;
  aggregationKey: string | null;
  deepLinkPath: string;
};
