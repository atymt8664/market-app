import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),

  reporterId: integer("reporter_id").notNull(),

  targetUserId: integer("target_user_id"),
  targetAdId: integer("target_ad_id"),

  reason: text("reason").notNull(),
  description: text("description"),

  status: text("status").notNull().default("pending"),

  createdAt: timestamp("created_at").defaultNow(),
});
