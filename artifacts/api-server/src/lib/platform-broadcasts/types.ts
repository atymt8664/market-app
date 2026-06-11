export const BROADCAST_CATEGORIES = [
  "platform_update",
  "new_feature",
  "scheduled_maintenance",
  "security_alert",
  "official_announcement",
] as const;

export type BroadcastCategory = (typeof BROADCAST_CATEGORIES)[number];

export const BROADCAST_AUDIENCES = ["all_users", "test_audience"] as const;

export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export const BROADCAST_STATUSES = [
  "draft",
  "sending",
  "completed",
  "failed",
  "cancelled",
] as const;

export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export type CreateBroadcastInput = {
  category: BroadcastCategory;
  title: string;
  body: string;
  audience?: BroadcastAudience;
  createdByAdminActorId: number;
};

export type BroadcastPreview = {
  category: BroadcastCategory;
  notificationType: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  estimatedRecipients: number;
};

export type BroadcastListItem = {
  id: number;
  category: BroadcastCategory;
  notificationType: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  createdByAdminActorId: number;
  sentAt: string | null;
  completedAt: string | null;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
};
