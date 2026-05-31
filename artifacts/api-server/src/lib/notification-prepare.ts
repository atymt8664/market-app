import type { CreateNotificationInput } from "./jobs/notification-types";
import { shouldDeliverInAppNotification } from "./notification-preference-gate";
import type { PreparedInAppNotification } from "./jobs/notification-types";

function sanitizeMetadata(
  meta: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> | null {
  if (!meta || typeof meta !== "object") return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!k || k.length > 64) continue;
    if (typeof v === "string") out[k] = v.slice(0, 500);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Validates input and checks in-app preference gate (same timing as sync path).
 * Returns null when notification should not be delivered.
 */
export async function prepareInAppNotification(
  input: CreateNotificationInput,
): Promise<PreparedInAppNotification | null> {
  const userId = input.userId;
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const type = String(input.type ?? "").trim().slice(0, 80);
  const title = String(input.title ?? "").trim().slice(0, 500);
  const body = String(input.body ?? "").trim().slice(0, 2000);
  if (!type || !title) return null;

  const allowed = await shouldDeliverInAppNotification(userId, type);
  if (!allowed) return null;

  let entityType: string | null = null;
  if (input.entityType != null && String(input.entityType).trim()) {
    entityType = String(input.entityType).trim().slice(0, 64);
  }

  let entityId: number | null = null;
  if (input.entityId != null) {
    const n = Number(input.entityId);
    if (Number.isInteger(n) && n > 0) entityId = n;
  }

  const metadata = sanitizeMetadata(input.metadata ?? null);

  return {
    userId,
    type,
    title,
    body,
    entityType,
    entityId,
    metadata,
  };
}
