import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const platformBroadcastsTable = pgTable(
  "platform_broadcasts",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    notificationType: text("notification_type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    audience: text("audience").notNull().default("all_users"),
    status: text("status").notNull().default("draft"),
    createdByAdminActorId: integer("created_by_admin_actor_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    recipientCount: integer("recipient_count").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    lastCursorUserId: integer("last_cursor_user_id"),
    sendIdempotencyKey: text("send_idempotency_key").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "platform_broadcasts_category_check",
      sql`${table.category} IN ('platform_update', 'new_feature', 'scheduled_maintenance', 'security_alert', 'official_announcement')`,
    ),
    check(
      "platform_broadcasts_status_check",
      sql`${table.status} IN ('draft', 'sending', 'completed', 'failed', 'cancelled')`,
    ),
    check(
      "platform_broadcasts_audience_check",
      sql`${table.audience} IN ('all_users', 'test_audience')`,
    ),
    uniqueIndex("platform_broadcasts_send_idempotency_unique").on(
      table.sendIdempotencyKey,
    ),
    index("platform_broadcasts_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    index("platform_broadcasts_created_by_idx").on(
      table.createdByAdminActorId,
      table.createdAt,
    ),
  ],
);

export type PlatformBroadcastRow = typeof platformBroadcastsTable.$inferSelect;
export type PlatformBroadcastInsert = typeof platformBroadcastsTable.$inferInsert;
