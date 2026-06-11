export type AdminNotificationCategory =
  | "moderation"
  | "reports"
  | "support"
  | "verification"
  | "operations"
  | "security"
  | "system";

/** 0=Critical · 1=High · 2=Medium · 3=Low */
export type AdminNotificationPriority = 0 | 1 | 2 | 3;

export type CreateAdminNotificationInput = {
  type: string;
  title: string;
  body?: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
  dedupKey?: string;
  category?: AdminNotificationCategory;
  priority?: AdminNotificationPriority;
  deepLinkPath?: string;
  requiredPermission?: string | null;
};

export type AdminNotificationApiRow = {
  id: number;
  type: string;
  category: AdminNotificationCategory;
  priority: AdminNotificationPriority;
  priorityLabel: "critical" | "high" | "medium" | "low";
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  deepLinkPath: string;
  readAt: string | null;
  createdAt: string;
};
