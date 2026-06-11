import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminNotificationsTable = pgTable(
  "admin_notifications",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    category: text("category").notNull(),
    priority: smallint("priority").notNull().default(2),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    dedupKey: text("dedup_key").notNull(),
    deepLinkPath: text("deep_link_path").notNull().default("/admin"),
    requiredPermission: text("required_permission"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dedupUnique: uniqueIndex("admin_notifications_dedup_key_unique").on(t.dedupKey),
    categoryCreatedIdx: index("admin_notifications_category_created_idx").on(
      t.category,
      t.createdAt,
    ),
    priorityCreatedIdx: index("admin_notifications_priority_created_idx").on(
      t.priority,
      t.createdAt,
    ),
    priorityCheck: check(
      "admin_notifications_priority_check",
      sql`${t.priority} >= 0 AND ${t.priority} <= 3`,
    ),
    categoryCheck: check(
      "admin_notifications_category_check",
      sql`${t.category} IN ('moderation', 'reports', 'support', 'verification', 'operations', 'security', 'system')`,
    ),
  }),
);

export const adminNotificationReadsTable = pgTable(
  "admin_notification_reads",
  {
    notificationId: integer("notification_id")
      .notNull()
      .references(() => adminNotificationsTable.id, { onDelete: "cascade" }),
    adminActorId: integer("admin_actor_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.notificationId, t.adminActorId] }),
    actorIdx: index("admin_notification_reads_actor_idx").on(t.adminActorId, t.readAt),
  }),
);

export type AdminNotificationRow = typeof adminNotificationsTable.$inferSelect;
export type AdminNotificationInsert = typeof adminNotificationsTable.$inferInsert;
