import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const adminActivityLogsTable = pgTable(
  "admin_activity_logs",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    actorAdminId: integer("actor_admin_id"),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id"),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actionIdx: index("admin_activity_logs_action_idx").on(t.action),
    targetTypeIdx: index("admin_activity_logs_target_type_idx").on(t.targetType),
    targetIdIdx: index("admin_activity_logs_target_id_idx").on(t.targetId),
    createdAtIdx: index("admin_activity_logs_created_at_idx").on(t.createdAt),
    actorAdminIdIdx: index("admin_activity_logs_actor_admin_id_idx").on(t.actorAdminId),
  }),
);
