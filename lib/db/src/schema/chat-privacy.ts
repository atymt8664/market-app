import { integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { conversationsTable, messagesTable } from "./messages";

/** Per-user soft-delete: hidden messages still exist for the other party. */
export const messageHidesTable = pgTable(
  "message_hides",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    messageId: integer("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.messageId] }),
  }),
);

/** Per-user: conversation hidden from inbox list (thread can be reopened by direct link). */
export const conversationHidesTable = pgTable(
  "conversation_hides",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.conversationId] }),
  }),
);

/** Per-user: conversation removed from inbox and hidden collection (WhatsApp-style restore on inbound message). */
export const conversationDeletesTable = pgTable(
  "conversation_deletes",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.conversationId] }),
  }),
);
