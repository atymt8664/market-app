import { adminNotificationsTable, db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { resolveAdminTypeRule, normalizeAdminNotificationType } from "./catalog";
import { adminNotificationDeepLinkPath } from "./deep-link";
import type { CreateAdminNotificationInput } from "./types";

let ensureSchemaPromise: Promise<void> | null = null;

const DDL = `
  CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    priority SMALLINT NOT NULL DEFAULT 2,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    entity_type TEXT,
    entity_id INTEGER,
    metadata JSONB,
    dedup_key TEXT NOT NULL,
    deep_link_path TEXT NOT NULL DEFAULT '/admin',
    required_permission TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT admin_notifications_priority_check CHECK (priority >= 0 AND priority <= 3),
    CONSTRAINT admin_notifications_category_check CHECK (
      category IN ('moderation', 'reports', 'support', 'verification', 'operations', 'security', 'system')
    )
  );
  CREATE UNIQUE INDEX IF NOT EXISTS admin_notifications_dedup_key_unique ON admin_notifications (dedup_key);
  CREATE INDEX IF NOT EXISTS admin_notifications_category_created_idx ON admin_notifications (category, created_at DESC);
  CREATE INDEX IF NOT EXISTS admin_notifications_priority_created_idx ON admin_notifications (priority, created_at DESC);
  CREATE TABLE IF NOT EXISTS admin_notification_reads (
    notification_id INTEGER NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
    admin_actor_id INTEGER NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, admin_actor_id)
  );
  CREATE INDEX IF NOT EXISTS admin_notification_reads_actor_idx ON admin_notification_reads (admin_actor_id, read_at DESC);
`;

export async function ensureAdminNotificationsSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = db.execute(sql.raw(DDL)).then(() => undefined).catch((err) => {
      ensureSchemaPromise = null;
      throw err;
    });
  }
  return ensureSchemaPromise;
}

function buildDedupKey(input: CreateAdminNotificationInput, type: string): string {
  if (input.dedupKey?.trim()) return input.dedupKey.trim().slice(0, 200);
  const et = input.entityType ?? "none";
  const eid = input.entityId ?? 0;
  return `admin:${type}:${et}:${eid}`.slice(0, 200);
}

export async function upsertAdminNotification(
  input: CreateAdminNotificationInput,
): Promise<number | null> {
  await ensureAdminNotificationsSchema();
  const type = normalizeAdminNotificationType(input.type);
  const rule = resolveAdminTypeRule(type);
  const dedupKey = buildDedupKey(input, type);
  const deepLinkPath =
    input.deepLinkPath?.trim() ||
    adminNotificationDeepLinkPath(input.entityType, input.entityId ?? null);

  const rows = await db
    .insert(adminNotificationsTable)
    .values({
      type,
      category: input.category ?? rule.category,
      priority: input.priority ?? rule.priority,
      title: input.title.trim().slice(0, 300),
      body: (input.body ?? "").trim().slice(0, 2000),
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      dedupKey,
      deepLinkPath,
      requiredPermission: input.requiredPermission ?? rule.permission,
    })
    .onConflictDoUpdate({
      target: adminNotificationsTable.dedupKey,
      set: {
        title: input.title.trim().slice(0, 300),
        body: (input.body ?? "").trim().slice(0, 2000),
        priority: input.priority ?? rule.priority,
        deepLinkPath,
      },
    })
    .returning({ id: adminNotificationsTable.id });

  return rows[0]?.id ?? null;
}
