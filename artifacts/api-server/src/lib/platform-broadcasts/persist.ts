import { db, platformBroadcastsTable } from "@workspace/db";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { usersTable } from "@workspace/db";
import { resolveBroadcastNotificationType } from "./catalog";
import { parseBroadcastTestEmails } from "./safety";
import type {
  BroadcastAudience,
  BroadcastListItem,
  BroadcastStatus,
  CreateBroadcastInput,
} from "./types";

const BATCH_SIZE = 500;

let ensureSchemaPromise: Promise<void> | null = null;

const DDL = `
  CREATE TABLE IF NOT EXISTS platform_broadcasts (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT 'all_users',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by_admin_actor_id INTEGER NOT NULL,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    last_cursor_user_id INTEGER,
    send_idempotency_key TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT platform_broadcasts_category_check CHECK (
      category IN (
        'platform_update',
        'new_feature',
        'scheduled_maintenance',
        'security_alert',
        'official_announcement'
      )
    ),
    CONSTRAINT platform_broadcasts_status_check CHECK (
      status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT platform_broadcasts_audience_check CHECK (
      audience IN ('all_users', 'test_audience')
    )
  );
  CREATE UNIQUE INDEX IF NOT EXISTS platform_broadcasts_send_idempotency_unique
    ON platform_broadcasts (send_idempotency_key);
  CREATE INDEX IF NOT EXISTS platform_broadcasts_status_created_idx
    ON platform_broadcasts (status, created_at DESC);
  CREATE INDEX IF NOT EXISTS platform_broadcasts_created_by_idx
    ON platform_broadcasts (created_by_admin_actor_id, created_at DESC);
`;

export async function ensurePlatformBroadcastsSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = db
      .execute(sql.raw(DDL))
      .then(() => undefined)
      .catch((err) => {
        ensureSchemaPromise = null;
        throw err;
      });
  }
  return ensureSchemaPromise;
}

function toListItem(row: typeof platformBroadcastsTable.$inferSelect): BroadcastListItem {
  return {
    id: row.id,
    category: row.category as BroadcastListItem["category"],
    notificationType: row.notificationType,
    title: row.title,
    body: row.body,
    audience: row.audience as BroadcastAudience,
    status: row.status as BroadcastStatus,
    createdByAdminActorId: row.createdByAdminActorId,
    sentAt: row.sentAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    recipientCount: row.recipientCount,
    deliveredCount: row.deliveredCount,
    failedCount: row.failedCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function countBroadcastRecipients(
  audience: BroadcastAudience,
): Promise<number> {
  await ensurePlatformBroadcastsSchema();
  if (audience === "test_audience") {
    const emails = parseBroadcastTestEmails();
    if (emails.length === 0) return 0;
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.isBanned, false),
          inArray(sql`lower(${usersTable.email})`, emails),
        ),
      );
    return row?.count ?? 0;
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.isBanned, false));
  return row?.count ?? 0;
}

export async function listBroadcastRecipientIds(
  audience: BroadcastAudience,
  afterUserId: number,
  limit = BATCH_SIZE,
): Promise<number[]> {
  await ensurePlatformBroadcastsSchema();
  const baseWhere = and(
    eq(usersTable.isBanned, false),
    gt(usersTable.id, afterUserId),
  );

  if (audience === "test_audience") {
    const emails = parseBroadcastTestEmails();
    if (emails.length === 0) return [];
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          baseWhere,
          inArray(sql`lower(${usersTable.email})`, emails),
        ),
      )
      .orderBy(usersTable.id)
      .limit(limit);
    return rows.map((r) => r.id);
  }

  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(baseWhere)
    .orderBy(usersTable.id)
    .limit(limit);
  return rows.map((r) => r.id);
}

export async function createBroadcastDraft(
  input: CreateBroadcastInput,
): Promise<BroadcastListItem> {
  await ensurePlatformBroadcastsSchema();
  const notificationType = resolveBroadcastNotificationType(input.category);
  const audience = input.audience ?? "all_users";
  const idempotencyKey = `draft:${input.createdByAdminActorId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

  const [row] = await db
    .insert(platformBroadcastsTable)
    .values({
      category: input.category,
      notificationType,
      title: input.title.trim().slice(0, 300),
      body: input.body.trim().slice(0, 4000),
      audience,
      status: "draft",
      createdByAdminActorId: input.createdByAdminActorId,
      sendIdempotencyKey: idempotencyKey,
      metadata: { source: "admin_broadcast_center" },
    })
    .returning();

  if (!row) throw new Error("broadcast insert failed");
  return toListItem(row);
}

export async function getBroadcastById(id: number) {
  await ensurePlatformBroadcastsSchema();
  const [row] = await db
    .select()
    .from(platformBroadcastsTable)
    .where(eq(platformBroadcastsTable.id, id))
    .limit(1);
  return row ?? null;
}

export async function listBroadcasts(limit = 50): Promise<BroadcastListItem[]> {
  await ensurePlatformBroadcastsSchema();
  const rows = await db
    .select()
    .from(platformBroadcastsTable)
    .orderBy(desc(platformBroadcastsTable.createdAt))
    .limit(limit);
  return rows.map(toListItem);
}

export async function markBroadcastSending(
  id: number,
  recipientCount: number,
  sendIdempotencyKey: string,
): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .update(platformBroadcastsTable)
    .set({
      status: "sending",
      sentAt: now,
      updatedAt: now,
      recipientCount,
      sendIdempotencyKey,
      lastCursorUserId: 0,
    })
    .where(
      and(
        eq(platformBroadcastsTable.id, id),
        eq(platformBroadcastsTable.status, "draft"),
      ),
    )
    .returning({ id: platformBroadcastsTable.id });
  return rows.length > 0;
}

export async function updateBroadcastFanoutProgress(
  id: number,
  patch: {
    lastCursorUserId: number;
    deliveredDelta: number;
    failedDelta: number;
  },
): Promise<void> {
  const now = new Date();
  await db
    .update(platformBroadcastsTable)
    .set({
      lastCursorUserId: patch.lastCursorUserId,
      deliveredCount: sql`${platformBroadcastsTable.deliveredCount} + ${patch.deliveredDelta}`,
      failedCount: sql`${platformBroadcastsTable.failedCount} + ${patch.failedDelta}`,
      updatedAt: now,
    })
    .where(eq(platformBroadcastsTable.id, id));
}

export async function markBroadcastCompleted(id: number): Promise<void> {
  const now = new Date();
  await db
    .update(platformBroadcastsTable)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(platformBroadcastsTable.id, id));
}

export async function markBroadcastFailed(id: number): Promise<void> {
  const now = new Date();
  await db
    .update(platformBroadcastsTable)
    .set({
      status: "failed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(platformBroadcastsTable.id, id));
}

export { BATCH_SIZE };
