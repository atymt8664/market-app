import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { adsTable } from "./ads";

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("general"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("normal"),
    relatedAdId: integer("related_ad_id").references(() => adsTable.id, {
      onDelete: "set null",
    }),
    relatedUserId: integer("related_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("support_tickets_user_idx").on(t.userId),
    statusIdx: index("support_tickets_status_idx").on(t.status),
  }),
);

export const supportTicketMessagesTable = pgTable(
  "support_ticket_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => supportTicketsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    adminId: integer("admin_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ticketIdx: index("support_ticket_messages_ticket_idx").on(t.ticketId),
  }),
);
