import {
  resolveNotificationCategory,
  resolveNotificationDomain,
  resolveNotificationPriority,
} from "./catalog";
import { buildNotificationAggregationKey } from "./aggregation-key";
import { buildNotificationDedupKey, isValidDedupKey } from "./dedup-key";
import { notificationDeepLinkPath } from "./deep-link";
import type {
  NotificationFoundationFields,
  NotificationFoundationInput,
} from "./types";

/**
 * Resolves cross-cutting notification foundation fields for a single event.
 * Pure function — safe to call before DB insert; persisted in P17-9-2.
 */
export function resolveNotificationFoundation(
  input: NotificationFoundationInput,
): NotificationFoundationFields {
  const type = input.type.trim().toLowerCase();

  const dedupKey = buildNotificationDedupKey({
    userId: input.userId,
    type,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    dedupKey: input.dedupKey,
  });

  if (!isValidDedupKey(dedupKey)) {
    throw new Error("invalid notification dedupKey");
  }

  return {
    domain: resolveNotificationDomain(type),
    category: resolveNotificationCategory(type),
    priority: resolveNotificationPriority(type),
    dedupKey,
    aggregationKey: buildNotificationAggregationKey({
      userId: input.userId,
      type,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    }),
    deepLinkPath: notificationDeepLinkPath({
      type,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    }),
  };
}
