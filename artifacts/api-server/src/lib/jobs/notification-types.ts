/** Sanitized in-app notification ready for DB insert (P15-3B). */

export type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  body?: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type PreparedInAppNotification = {
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, string | number | boolean> | null;
};

export type InAppNotificationJobPayload = PreparedInAppNotification & {
  /** STAGING smoke only — skips DB insert when true. */
  dryRun?: boolean;
};
