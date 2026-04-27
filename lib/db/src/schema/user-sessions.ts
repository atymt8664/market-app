import { index, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const userSessionsTable = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, withTimezone: false }).notNull(),
  },
  (t) => ({
    expireIdx: index("idx_user_sessions_expire").on(t.expire),
  }),
);
