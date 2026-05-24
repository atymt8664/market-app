import {
  boolean,
  integer,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * In-app + device push channel toggles. Rows are optional; missing row = all enabled.
 */
export const notificationPreferencesTable = pgTable("notification_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  notifyMessages: boolean("notify_messages").notNull().default(true),
  notifyAdModeration: boolean("notify_ad_moderation").notNull().default(true),
  notifySupport: boolean("notify_support").notNull().default(true),
  notifyReports: boolean("notify_reports").notNull().default(true),
  notifyAnnouncements: boolean("notify_announcements").notNull().default(true),
  notifyFavorites: boolean("notify_favorites").notNull().default(true),
  /** Master device push toggle (browser permission is separate). */
  pushEnabled: boolean("push_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreferencesRow =
  typeof notificationPreferencesTable.$inferSelect;
