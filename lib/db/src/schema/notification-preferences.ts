import {
  boolean,
  integer,
  pgTable,
  text,
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
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietHoursStart: text("quiet_hours_start").notNull().default("22:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
  quietHoursTimezone: text("quiet_hours_timezone").notNull().default("Europe/Berlin"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPreferencesRow =
  typeof notificationPreferencesTable.$inferSelect;
