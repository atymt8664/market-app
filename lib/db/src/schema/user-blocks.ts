import {
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const userBlocksTable = pgTable(
  "user_blocks",
  {
    id: serial("id").primaryKey(),
    blockerId: integer("blocker_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    blockedId: integer("blocked_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex("user_blocks_blocker_blocked_unique").on(
      t.blockerId,
      t.blockedId,
    ),
    blockerIdx: index("user_blocks_blocker_id_idx").on(t.blockerId),
    blockedIdx: index("user_blocks_blocked_id_idx").on(t.blockedId),
    noSelf: check(
      "user_blocks_no_self",
      sql`${t.blockerId} <> ${t.blockedId}`,
    ),
  }),
);

export type UserBlockRow = typeof userBlocksTable.$inferSelect;
export type InsertUserBlock = typeof userBlocksTable.$inferInsert;
