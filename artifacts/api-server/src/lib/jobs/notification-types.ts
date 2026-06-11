import type { NotificationFoundationFields } from "../notifications/types";

/** Sanitized in-app notification ready for DB insert (P15-3B). */

export type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  body?: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
  /** Optional explicit dedup key — validated by foundation (P17-9-1). */
  dedupKey?: string | null;
};

export type PreparedInAppNotification = {
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, string | number | boolean> | null;
  /** Resolved foundation fields — persisted on insert (P17-9-2). */
  foundation?: NotificationFoundationFields;
};

export type InAppNotificationJobPayload = PreparedInAppNotification & {
  /** STAGING smoke only — skips DB insert when true. */
  dryRun?: boolean;
};
