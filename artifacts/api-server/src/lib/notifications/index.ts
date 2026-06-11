export type {
  NotificationCategory,
  NotificationDeepLinkInput,
  NotificationDomain,
  NotificationFoundationFields,
  NotificationFoundationInput,
  NotificationPriority,
} from "./types";

export {
  normalizeNotificationType,
  resolveNotificationCategory,
  resolveNotificationDomain,
  resolveNotificationPriority,
  resolvePreferenceColumnForType,
  resolveTypeRule,
} from "./catalog";
export type { NotificationPreferenceColumn } from "./catalog";

export { buildNotificationDedupKey, isValidDedupKey } from "./dedup-key";
export type { DedupKeyInput } from "./dedup-key";

export { buildNotificationAggregationKey } from "./aggregation-key";

export { notificationDeepLinkPath } from "./deep-link";

export { resolveNotificationFoundation } from "./foundation";

export {
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_DOMAIN_VALUES,
  NOTIFICATION_PRIORITY_VALUES,
  isNotificationCategory,
  isNotificationDomain,
  isNotificationPriority,
  toNotificationApiRow,
} from "./contract";
export type { NotificationApiRow } from "./contract";

export { buildInAppJobIdempotencyKey } from "./idempotency";

export {
  buildNotificationInsertValues,
  resolvePersistedFoundation,
} from "./insert-values";

export {
  NOTIFICATION_REALTIME_EVENT,
  buildNotificationRealtimeWsEvent,
  broadcastNotificationCreated,
  shouldEmitNotificationRealtime,
} from "./realtime";
export type { NotificationRealtimeWsEvent } from "./realtime";

export {
  BADGE_COUNT_DISPLAY_CAP,
  clampBadgeCount,
  computeAppBadgeTotal,
  formatBadgeCount,
  getUnreadCounters,
  getUnreadMessagesCount,
  getUnreadNotificationsCount,
} from "./counters";
export type { UnreadCounters } from "./counters";
