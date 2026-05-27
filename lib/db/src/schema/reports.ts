import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { conversationsTable } from "./messages";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),

  reporterId: integer("reporter_id").notNull(),

  targetUserId: integer("target_user_id"),
  targetAdId: integer("target_ad_id"),
  /** When the report is tied to a chat thread (participant-only). */
  relatedConversationId: integer("related_conversation_id").references(
    () => conversationsTable.id,
    { onDelete: "set null" },
  ),

  reason: text("reason").notNull(),
  description: text("description"),

  status: text("status").notNull().default("open"),

  assignedStaffId: integer("assigned_staff_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  assignedByAdminId: integer("assigned_by_admin_id"),

  createdAt: timestamp("created_at").defaultNow(),
});
