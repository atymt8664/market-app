import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    dedupKey: text("dedup_key"),
    aggregationKey: text("aggregation_key"),
    priority: smallint("priority").notNull().default(2),
    category: text("category").notNull().default("system"),
    domain: text("domain").notNull().default("system"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
    userCreatedIdx: index("notifications_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
    userUnreadIdx: index("notifications_user_unread_idx")
      .on(t.userId)
      .where(sql`${t.readAt} IS NULL`),
    userDedupKeyUnique: uniqueIndex("notifications_user_dedup_key_unique")
      .on(t.userId, t.dedupKey)
      .where(sql`${t.dedupKey} IS NOT NULL`),
    userCategoryCreatedIdx: index("notifications_user_category_created_idx").on(
      t.userId,
      t.category,
      t.createdAt,
    ),
    userAggregationKeyIdx: index("notifications_user_aggregation_key_idx")
      .on(t.userId, t.aggregationKey)
      .where(sql`${t.aggregationKey} IS NOT NULL`),
    priorityCheck: check(
      "notifications_priority_check",
      sql`${t.priority} >= 0 AND ${t.priority} <= 3`,
    ),
    categoryCheck: check(
      "notifications_category_check",
      sql`${t.category} IN ('messages', 'marketplace', 'orders', 'support', 'reports', 'trust_safety', 'security', 'admin', 'system', 'social')`,
    ),
    domainCheck: check(
      "notifications_domain_check",
      sql`${t.domain} IN ('messages', 'marketplace', 'orders', 'support', 'reports', 'trust', 'security', 'admin', 'system', 'social', 'verification')`,
    ),
  }),
);

export type NotificationRow = typeof notificationsTable.$inferSelect;
export type NotificationInsert = typeof notificationsTable.$inferInsert;
