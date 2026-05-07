import { db, notificationsTable } from "@workspace/db";

export type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  body?: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
};

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
 * Inserts an in-app notification. Returns null if validation fails.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<number | null> {
  const userId = input.userId;
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const type = String(input.type ?? "").trim().slice(0, 80);
  const title = String(input.title ?? "").trim().slice(0, 500);
  const body = String(input.body ?? "").trim().slice(0, 2000);
  if (!type || !title) return null;

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

  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId,
      type,
      title,
      body,
      entityType,
      entityId,
      metadata: metadata ?? undefined,
    })
    .returning({ id: notificationsTable.id });

  return row?.id ?? null;
}
