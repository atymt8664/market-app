import { pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSecurityEventsTable = pgTable(
  "user_security_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("user_security_events_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export type UserSecurityEventRow = typeof userSecurityEventsTable.$inferSelect;
