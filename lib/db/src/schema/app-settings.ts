import { integer, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  appName: text("app_name").notNull().default("سوق العرب EU"),
  appVersion: text("app_version").notNull().default("1.0.0"),
  supportEmail: text("support_email").notNull().default("souqarab.market@gmail.com"),
  requireAdApproval: boolean("require_ad_approval").notNull().default(true),
  reportsEnabled: boolean("reports_enabled").notNull().default(true),
  supportEnabled: boolean("support_enabled").notNull().default(true),
  termsPath: text("terms_path").notNull().default("/terms"),
  privacyPath: text("privacy_path").notNull().default("/privacy"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByAdminId: integer("updated_by_admin_id"),
  adminPasswordHash: text("admin_password_hash"),
  admin2faEnabled: boolean("admin_2fa_enabled").notNull().default(false),
  admin2faSecret: text("admin_2fa_secret"),
  admin2faEnabledAt: timestamp("admin_2fa_enabled_at", { withTimezone: true }),
  adminBackupCodesHash: text("admin_backup_codes_hash"),
  adminSecurityRevision: integer("admin_security_revision").notNull().default(0),
});

