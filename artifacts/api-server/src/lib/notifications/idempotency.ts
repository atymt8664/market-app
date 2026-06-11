import crypto from "node:crypto";
import type { PreparedInAppNotification } from "../jobs/notification-types";

function idempotencyHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

/**
 * pg-boss job idempotency key — prefers foundation dedup_key (P17-9-2).
 * Legacy hash fallback when dedup_key is unavailable.
 */
export function buildInAppJobIdempotencyKey(
  input: PreparedInAppNotification,
): string {
  const dedup = input.foundation?.dedupKey?.trim();
  if (dedup) return `notify.in_app:dedup:${input.userId}:${dedup}`;

  const entityPart = input.entityId != null ? String(input.entityId) : "none";
  const metaPart = input.metadata ? JSON.stringify(input.metadata) : "";
  return `notify.in_app:${input.userId}:${input.type}:${entityPart}:${idempotencyHash(`${input.title}|${input.body}|${metaPart}`)}`;
}
