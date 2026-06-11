import type { DedupKeyInput } from "./dedup-key";
import { normalizeNotificationType } from "./catalog";

export type AggregationKeyInput = DedupKeyInput;

/**
 * Window key for bundling multiple events into one notification row (P17-9-10).
 * Returns null when type should not aggregate.
 */
export function buildNotificationAggregationKey(input: AggregationKeyInput): string | null {
  const userId = input.userId;
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const type = normalizeNotificationType(input.type);
  const entityType = input.entityType?.trim().toLowerCase() ?? "";
  const entityId = input.entityId ?? null;

  if (type.startsWith("message.") || type.startsWith("chat.")) {
    const convId =
      (entityType === "conversation" ? entityId : null) ??
      (typeof input.metadata?.conversationId === "number" ? input.metadata.conversationId : null);
    if (convId) return `agg:msg:conv:${userId}:${convId}`;
    return `agg:msg:user:${userId}`;
  }

  if (type.startsWith("ad.favorited") || type.startsWith("social.favorited")) {
    const adId = entityType === "ad" ? entityId : null;
    if (adId) return `agg:fav:ad:${userId}:${adId}`;
  }

  if (type.startsWith("social.liked") || type.startsWith("ad.liked")) {
    const adId = entityType === "ad" ? entityId : null;
    if (adId) return `agg:like:ad:${userId}:${adId}`;
  }

  if (type.startsWith("social.followed")) {
    return `agg:follow:user:${userId}`;
  }

  if (type.startsWith("order.tracking")) {
    const orderNumber =
      typeof input.metadata?.order_number === "string" ? input.metadata.order_number.trim() : "";
    if (orderNumber) return `agg:order:tracking:${userId}:${orderNumber}`;
  }

  return null;
}
