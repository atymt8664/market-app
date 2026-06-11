import { createHash } from "node:crypto";
import { normalizeNotificationType } from "./catalog";

export type DedupKeyInput = {
  userId: number;
  type: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
  dedupKey?: string | null;
};

const DEDUP_KEY_MAX = 128;

function hashPart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function readPositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function readNonEmptyString(value: unknown, max = 64): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  return s.slice(0, max);
}

/**
 * Builds a stable dedup key for idempotent notification insert (P17-9-2 DB unique index).
 * Producers may pass explicit dedupKey; otherwise inferred from type + entity + metadata.
 */
export function buildNotificationDedupKey(input: DedupKeyInput): string | null {
  if (input.dedupKey != null && String(input.dedupKey).trim()) {
    const explicit = String(input.dedupKey).trim().slice(0, DEDUP_KEY_MAX);
    return explicit || null;
  }

  const userId = input.userId;
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const type = normalizeNotificationType(input.type);
  if (!type) return null;

  const entityType = input.entityType?.trim().toLowerCase() ?? "";
  const entityId = input.entityId ?? null;

  if (type.startsWith("message.") || type.startsWith("chat.")) {
    const convId =
      (entityType === "conversation" ? entityId : null) ??
      readPositiveInt(input.metadata?.conversationId);
    const messageId = readPositiveInt(input.metadata?.messageId);
    if (convId && messageId) return `msg:${userId}:${convId}:${messageId}`;
    if (convId) return `msg:conv:${userId}:${convId}`;
    return null;
  }

  if (type.startsWith("order.")) {
    const orderNumber = readNonEmptyString(input.metadata?.order_number, 32);
    if (orderNumber) return `order:${userId}:${orderNumber}:${type}`;
    if (entityType === "order" && entityId != null) return `order:${userId}:${entityId}:${type}`;
    return null;
  }

  if (type.startsWith("ad.favorited") || type.startsWith("social.favorited")) {
    const actorId = readPositiveInt(input.metadata?.actorUserId);
    const adId = entityType === "ad" ? entityId : readPositiveInt(input.metadata?.adId);
    if (adId && actorId) return `fav:${userId}:${adId}:${actorId}`;
    return null;
  }

  if (type.startsWith("ad.")) {
    if (entityType === "ad" && entityId != null) return `ad:${userId}:${entityId}:${type}`;
    return null;
  }

  if (type.startsWith("support.")) {
    if (entityType === "support_ticket" && entityId != null) {
      return `support:${userId}:${entityId}:${type}`;
    }
    return null;
  }

  if (type.startsWith("verification.")) {
    const reqId =
      (entityType === "verification_request" ? entityId : null) ??
      readPositiveInt(input.metadata?.requestId);
    if (reqId) return `verification:${userId}:${reqId}:${type}`;
    return null;
  }

  if (type.startsWith("security.") || type.startsWith("trust.")) {
    const enforcementId = readNonEmptyString(input.metadata?.enforcement_id, 48);
    if (enforcementId) return `enforcement:${userId}:${enforcementId}:${type}`;
    const eventId = readNonEmptyString(input.metadata?.eventId, 48);
    if (eventId) return `security:${userId}:${eventId}:${type}`;
    return `security:${userId}:${type}:${hashPart(JSON.stringify(input.metadata ?? {}))}`;
  }

  if (entityType && entityId != null) {
    return `${entityType}:${userId}:${entityId}:${type}`;
  }

  return null;
}

export function isValidDedupKey(value: string | null | undefined): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  if (!s) return true;
  return s.length <= DEDUP_KEY_MAX && /^[a-z0-9:._-]+$/i.test(s);
}
