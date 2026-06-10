import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { messagesTable } from "./messages";

/** One reaction emoji per user per message (toggle / replace). */
export const messageReactionsTable = pgTable(
  "message_reactions",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMessageUnique: uniqueIndex("message_reactions_user_message_unique").on(
      t.messageId,
      t.userId,
    ),
  }),
);

export type MessageReactionRow = typeof messageReactionsTable.$inferSelect;
