import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  db,
  adminActivityLogsTable,
  adsTable,
  categoriesTable,
  reportsTable,
  subcategoriesTable,
  supportTicketsTable,
  usersTable,
} from "@workspace/db";
import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { alias, boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { ensureAdminLogsReady, getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";
import { ensureCategoryAdminColumns } from "../lib/ensure-category-admin-columns";
import { ensureCityAdminColumns } from "../lib/ensure-city-admin-columns";
import { ensureAppSettingsTable } from "../lib/ensure-app-settings-table";
import { bumpAdminSecurityRevision } from "../lib/admin-auth-settings";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { getSessionClearCookieOptions, SESSION_COOKIE_NAME } from "../lib/session-cookie";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";

const router = Router();
const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull(),
  countryName: text("country_name").notNull(),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
const appSettingsTable = pgTable("app_settings", {
  id: integer("id").primaryKey(),
  appName: text("app_name").notNull(),
  appVersion: text("app_version").notNull(),
  supportEmail: text("support_email").notNull(),
  requireAdApproval: boolean("require_ad_approval").notNull().default(true),
  reportsEnabled: boolean("reports_enabled").notNull().default(true),
  supportEnabled: boolean("support_enabled").notNull().default(true),
  termsPath: text("terms_path").notNull(),
  privacyPath: text("privacy_path").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByAdminId: integer("updated_by_admin_id"),
  adminPasswordHash: text("admin_password_hash"),
  admin2faEnabled: boolean("admin_2fa_enabled").notNull().default(false),
  admin2faSecret: text("admin_2fa_secret"),
  admin2faEnabledAt: timestamp("admin_2fa_enabled_at", { withTimezone: true }),
  adminBackupCodesHash: text("admin_backup_codes_hash"),
  adminSecurityRevision: integer("admin_security_revision").notNull().default(0),
});

router.use(async (_req, _res, next) => {
  try {
    await ensureCategoryAdminColumns();
    await ensureCityAdminColumns();
    await ensureAppSettingsTable();
    next();
  } catch (error) {
    next(error);
  }
});
router.use("/admin", requireAdminIpAllowlist, requireAdminAccessGrant, requireAdmin);

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type AdminStatsPeriod = "today" | "7d" | "30d" | "all";

function parseStatsPeriod(raw: unknown): AdminStatsPeriod {
  const value = String(raw || "all").trim().toLowerCase();
  if (value === "today" || value === "7d" || value === "30d" || value === "all") {
    return value;
  }
  return "all";
}

function getPeriodStart(period: AdminStatsPeriod): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const days = period === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function normalizePathLike(input: unknown, fallback: string): string {
  const value = String(input ?? "").trim();
  if (!value) return fallback;
  if (value.startsWith("/")) {
    const normalized = value.length > 1 ? value.replace(/\/+$/, "") : value;
    return normalized.slice(0, 255);
  }
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/+$/, "").slice(0, 255);
  }
  return fallback;
}

const SETTINGS_DEFAULTS = {
  appName: "سوق العرب EU",
  appVersion: "1.0.0",
  supportEmail: "souqarab.market@gmail.com",
  termsPath: "/terms",
  privacyPath: "/privacy",
} as const;

function normalizeAppName(input: unknown): string {
  const value = String(input ?? "").trim().slice(0, 120);
  if (!value || value.includes("?") || value.includes("�")) {
    return SETTINGS_DEFAULTS.appName;
  }
  return value;
}

function normalizeAppVersion(input: unknown): string {
  const value = String(input ?? "").trim().slice(0, 40);
  if (!value) return SETTINGS_DEFAULTS.appVersion;
  return value;
}

function normalizeSupportEmail(input: unknown): string {
  const value = String(input ?? "").trim().toLowerCase().slice(0, 160);
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return SETTINGS_DEFAULTS.supportEmail;
  }
  return value;
}

function validateStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function reportStatusNotificationPayload(status: string): { type: string; title: string; body: string } | null {
  if (status === "in_review" || status === "reviewing") {
    return {
      type: "report.reviewing",
      title: "تحديث حالة البلاغ",
      body: "بلاغك قيد المراجعة",
    };
  }
  if (status === "resolved") {
    return {
      type: "report.resolved",
      title: "تحديث حالة البلاغ",
      body: "تم حل بلاغك",
    };
  }
  if (status === "ignored" || status === "dismissed" || status === "rejected") {
    return {
      type: "report.ignored",
      title: "تحديث حالة البلاغ",
      body: "تمت مراجعة بلاغك ولم يتم اتخاذ إجراء إضافي",
    };
  }
  return null;
}

router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  const [usersTotal] = await db.select({ c: count() }).from(usersTable);
  const [adsTotal] = await db.select({ c: count() }).from(adsTable);
  const [reportsTotal] = await db.select({ c: count() }).from(reportsTable);
  const [viewsTotal] = await db
    .select({ c: sql<number>`coalesce(sum(${adsTable.views}), 0)::int` })
    .from(adsTable);

  const reportReporter = alias(usersTable, "dashboard_report_reporter");
  const reportAdOwner = alias(usersTable, "dashboard_report_ad_owner");
  const reportTargetUser = alias(usersTable, "dashboard_report_target_user");

  const latestReports = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
      reporterName: reportReporter.name,
      reporterAvatarUrl: reportReporter.avatarUrl,
      targetAdId: reportsTable.targetAdId,
      targetUserId: reportsTable.targetUserId,
      targetAdTitle: adsTable.title,
      targetAdSellerName: adsTable.sellerName,
      targetAdOwnerAvatarUrl: reportAdOwner.avatarUrl,
      targetAdOwnerName: reportAdOwner.name,
      targetProfileName: reportTargetUser.name,
      targetProfileAvatarUrl: reportTargetUser.avatarUrl,
    })
    .from(reportsTable)
    .leftJoin(reportReporter, eq(reportReporter.id, reportsTable.reporterId))
    .leftJoin(adsTable, eq(adsTable.id, reportsTable.targetAdId))
    .leftJoin(reportAdOwner, eq(reportAdOwner.id, adsTable.userId))
    .leftJoin(reportTargetUser, eq(reportTargetUser.id, reportsTable.targetUserId))
    .orderBy(desc(reportsTable.createdAt))
    .limit(8);

  let latestSupportTickets: Array<{
    id: number;
    subject: string;
    status: string;
    createdAt: Date;
    userName: string | null;
  }> = [];
  try {
    latestSupportTickets = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
        userName: usersTable.name,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(8);
  } catch {
    latestSupportTickets = [];
  }

  const topAds = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      views: adsTable.views,
      status: adsTable.status,
      city: adsTable.city,
    })
    .from(adsTable)
    .orderBy(desc(adsTable.views), desc(adsTable.createdAt))
    .limit(8);

  const topCities = await db
    .select({
      city: adsTable.city,
      adsCount: count(adsTable.id),
      totalViews: sql<number>`coalesce(sum(${adsTable.views}), 0)::int`,
    })
    .from(adsTable)
    .where(and(sql`${adsTable.city} is not null`, sql`${adsTable.city} <> ''`))
    .groupBy(adsTable.city)
    .orderBy(desc(count(adsTable.id)))
    .limit(8);

  const adsStatus = await db
    .select({
      status: adsTable.status,
      value: count(adsTable.id),
    })
    .from(adsTable)
    .groupBy(adsTable.status);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    pendingAdsRow,
    openReportsRow,
    openSupportRow,
    newUsersTodayRow,
    publishedTodayAdsRow,
    newReportsRow,
    featuredAdsCountRow,
    adsStatusCounts,
    reportsStatusCounts,
    supportStatusCounts,
    usersStatusCounts,
  ] =
    await Promise.all([
      db
        .select({ value: count(adsTable.id) })
        .from(adsTable)
        .where(eq(adsTable.status, "pending"))
        .then((rows) => rows[0]),
      db
        .select({ value: count(reportsTable.id) })
        .from(reportsTable)
        .where(inArray(reportsTable.status, ["pending", "in_review"]))
        .then((rows) => rows[0]),
      db
        .select({ value: count(supportTicketsTable.id) })
        .from(supportTicketsTable)
        .where(inArray(supportTicketsTable.status, ["open", "pending"]))
        .then((rows) => rows[0]),
      db
        .select({ value: count(usersTable.id) })
        .from(usersTable)
        .where(gte(usersTable.createdAt, startOfToday))
        .then((rows) => rows[0]),
      db
        .select({ value: count(adsTable.id) })
        .from(adsTable)
        .where(
          and(
            eq(adsTable.status, "approved"),
            gte(adsTable.createdAt, startOfToday),
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({ value: count(reportsTable.id) })
        .from(reportsTable)
        .where(eq(reportsTable.status, "pending"))
        .then((rows) => rows[0]),
      db
        .select({ value: count(adsTable.id) })
        .from(adsTable)
        .where(eq(adsTable.featured, true))
        .then((rows) => rows[0]),
      db
        .select({ status: adsTable.status, value: count(adsTable.id) })
        .from(adsTable)
        .groupBy(adsTable.status),
      db
        .select({ status: reportsTable.status, value: count(reportsTable.id) })
        .from(reportsTable)
        .groupBy(reportsTable.status),
      db
        .select({ status: supportTicketsTable.status, value: count(supportTicketsTable.id) })
        .from(supportTicketsTable)
        .groupBy(supportTicketsTable.status),
      db
        .select({
          status: sql<string>`case when ${usersTable.isBanned} then 'blocked' else 'active' end`,
          value: count(usersTable.id),
        })
        .from(usersTable)
        .groupBy(usersTable.isBanned),
    ]);

  const toStatusMap = (
    rows: Array<{ status: string | null; value: number | string | null }>,
    defaults: string[],
  ) => {
    const output: Record<string, number> = {};
    for (const key of defaults) output[key] = 0;
    for (const row of rows) {
      const key = String(row.status || "unknown");
      output[key] = Number(row.value ?? 0);
    }
    return output;
  };

  const reportCounts = toStatusMap(reportsStatusCounts, [
    "pending",
    "in_review",
    "resolved",
    "ignored",
  ]);
  if (!reportCounts.ignored && reportCounts.rejected) {
    reportCounts.ignored = Number(reportCounts.rejected ?? 0);
  }

  return res.json({
    totals: {
      users: Number(usersTotal?.c ?? 0),
      ads: Number(adsTotal?.c ?? 0),
      reports: Number(reportsTotal?.c ?? 0),
      views: Number(viewsTotal?.c ?? 0),
    },
    latestReports: latestReports.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    latestSupportTickets: latestSupportTickets.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    topAds,
    topCities: topCities.map((row) => ({
      city: row.city || "غير محدد",
      adsCount: Number(row.adsCount ?? 0),
      totalViews: Number(row.totalViews ?? 0),
    })),
    adsStatus: adsStatus.map((row) => ({
      status: row.status || "unknown",
      value: Number(row.value ?? 0),
    })),
    badges: {
      adsPendingReview: Number(pendingAdsRow?.value ?? 0),
      reportsOpen: Number(openReportsRow?.value ?? 0),
      supportOpen: Number(openSupportRow?.value ?? 0),
      usersNewToday: Number(newUsersTodayRow?.value ?? 0),
    },
    highlights: {
      adsPendingReview: Number(pendingAdsRow?.value ?? 0),
      reportsNew: Number(newReportsRow?.value ?? 0),
      supportOpen: Number(openSupportRow?.value ?? 0),
      adsPublishedToday: Number(publishedTodayAdsRow?.value ?? 0),
      featuredAdsCount: Number(featuredAdsCountRow?.value ?? 0),
    },
    statusCounts: {
      ads: toStatusMap(adsStatusCounts, ["pending", "approved", "rejected", "hidden"]),
      reports: reportCounts,
      support: toStatusMap(supportStatusCounts, ["open", "pending", "resolved", "closed"]),
      users: toStatusMap(usersStatusCounts, ["active", "blocked"]),
    },
  });
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  const period = parseStatsPeriod(req.query.period);
  const periodStart = getPeriodStart(period);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    usersTotalRow,
    adsTotalRow,
    reportsTotalRow,
    supportTotalRow,
    viewsTotalRow,
    citiesTotalRow,
    categoriesTotalRow,
    usersNewTodayRow,
    usersNewWeekRow,
    usersNewMonthRow,
    adsPublishedTodayRow,
    adsStatusRows,
    reportsInReviewRow,
    reportsResolvedRow,
    reportsOpenRow,
    reportsNewRow,
    supportStatusRows,
    periodUsersRow,
    periodAdsRow,
    periodReportsRow,
    periodSupportRow,
    periodViewsRow,
    topCitiesRows,
    topCategoriesRows,
    topAdsRows,
  ] = await Promise.all([
    db.select({ value: count(usersTable.id) }).from(usersTable).then((rows) => rows[0]),
    db.select({ value: count(adsTable.id) }).from(adsTable).then((rows) => rows[0]),
    db.select({ value: count(reportsTable.id) }).from(reportsTable).then((rows) => rows[0]),
    db
      .select({ value: count(supportTicketsTable.id) })
      .from(supportTicketsTable)
      .then((rows) => rows[0]),
    db
      .select({ value: sql<number>`coalesce(sum(${adsTable.views}), 0)::int` })
      .from(adsTable)
      .then((rows) => rows[0]),
    db.select({ value: count(citiesTable.id) }).from(citiesTable).then((rows) => rows[0]),
    db.select({ value: count(categoriesTable.id) }).from(categoriesTable).then((rows) => rows[0]),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startOfToday))
      .then((rows) => rows[0]),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startOfWeek))
      .then((rows) => rows[0]),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startOfMonth))
      .then((rows) => rows[0]),
    db
      .select({ value: count(adsTable.id) })
      .from(adsTable)
      .where(and(eq(adsTable.status, "approved"), gte(adsTable.createdAt, startOfToday)))
      .then((rows) => rows[0]),
    db
      .select({ status: adsTable.status, value: count(adsTable.id) })
      .from(adsTable)
      .groupBy(adsTable.status),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(eq(reportsTable.status, "in_review"))
      .then((rows) => rows[0]),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(eq(reportsTable.status, "resolved"))
      .then((rows) => rows[0]),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(inArray(reportsTable.status, ["pending", "in_review"]))
      .then((rows) => rows[0]),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(periodStart ? gte(reportsTable.createdAt, periodStart) : undefined)
      .then((rows) => rows[0]),
    db
      .select({ status: supportTicketsTable.status, value: count(supportTicketsTable.id) })
      .from(supportTicketsTable)
      .groupBy(supportTicketsTable.status),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(periodStart ? gte(usersTable.createdAt, periodStart) : undefined)
      .then((rows) => rows[0]),
    db
      .select({ value: count(adsTable.id) })
      .from(adsTable)
      .where(periodStart ? gte(adsTable.createdAt, periodStart) : undefined)
      .then((rows) => rows[0]),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(periodStart ? gte(reportsTable.createdAt, periodStart) : undefined)
      .then((rows) => rows[0]),
    db
      .select({ value: count(supportTicketsTable.id) })
      .from(supportTicketsTable)
      .where(periodStart ? gte(supportTicketsTable.createdAt, periodStart) : undefined)
      .then((rows) => rows[0]),
    db
      .select({ value: sql<number>`coalesce(sum(${adsTable.views}), 0)::int` })
      .from(adsTable)
      .where(periodStart ? gte(adsTable.createdAt, periodStart) : undefined)
      .then((rows) => rows[0]),
    db
      .select({
        city: adsTable.city,
        adsCount: count(adsTable.id),
        totalViews: sql<number>`coalesce(sum(${adsTable.views}), 0)::int`,
      })
      .from(adsTable)
      .where(
        and(
          sql`${adsTable.city} is not null`,
          sql`${adsTable.city} <> ''`,
          periodStart ? gte(adsTable.createdAt, periodStart) : undefined,
        ),
      )
      .groupBy(adsTable.city)
      .orderBy(desc(count(adsTable.id)), desc(sql<number>`coalesce(sum(${adsTable.views}), 0)::int`))
      .limit(8),
    db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        adsCount: count(adsTable.id),
        totalViews: sql<number>`coalesce(sum(${adsTable.views}), 0)::int`,
      })
      .from(categoriesTable)
      .leftJoin(adsTable, eq(adsTable.categoryId, categoriesTable.id))
      .where(periodStart ? gte(adsTable.createdAt, periodStart) : undefined)
      .groupBy(categoriesTable.id)
      .orderBy(desc(count(adsTable.id)), desc(sql<number>`coalesce(sum(${adsTable.views}), 0)::int`))
      .limit(8),
    db
      .select({
        id: adsTable.id,
        title: adsTable.title,
        views: adsTable.views,
        city: adsTable.city,
        status: adsTable.status,
        createdAt: adsTable.createdAt,
      })
      .from(adsTable)
      .where(periodStart ? gte(adsTable.createdAt, periodStart) : undefined)
      .orderBy(desc(adsTable.views), desc(adsTable.createdAt))
      .limit(8),
  ]);

  const adsStatusMap: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
  };
  for (const row of adsStatusRows) {
    const key = String(row.status || "unknown");
    adsStatusMap[key] = Number(row.value ?? 0);
  }

  const supportStatusMap: Record<string, number> = {
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  };
  for (const row of supportStatusRows) {
    const key = String(row.status || "unknown");
    supportStatusMap[key] = Number(row.value ?? 0);
  }

  return res.json({
    period,
    generatedAt: new Date().toISOString(),
    totals: {
      users: Number(usersTotalRow?.value ?? 0),
      ads: Number(adsTotalRow?.value ?? 0),
      reports: Number(reportsTotalRow?.value ?? 0),
      supportTickets: Number(supportTotalRow?.value ?? 0),
      views: Number(viewsTotalRow?.value ?? 0),
      cities: Number(citiesTotalRow?.value ?? 0),
      categories: Number(categoriesTotalRow?.value ?? 0),
    },
    users: {
      newToday: Number(usersNewTodayRow?.value ?? 0),
      newWeek: Number(usersNewWeekRow?.value ?? 0),
      newMonth: Number(usersNewMonthRow?.value ?? 0),
    },
    ads: {
      publishedToday: Number(adsPublishedTodayRow?.value ?? 0),
      pending: Number(adsStatusMap.pending ?? 0),
      approved: Number(adsStatusMap.approved ?? 0),
      rejected: Number(adsStatusMap.rejected ?? 0),
      hidden: Number(adsStatusMap.hidden ?? 0),
    },
    reports: {
      total: Number(reportsTotalRow?.value ?? 0),
      new: Number(reportsNewRow?.value ?? 0),
      inReview: Number(reportsInReviewRow?.value ?? 0),
      resolved: Number(reportsResolvedRow?.value ?? 0),
      open: Number(reportsOpenRow?.value ?? 0),
    },
    support: {
      total: Number(supportTotalRow?.value ?? 0),
      open: Number(supportStatusMap.open ?? 0),
      pending: Number(supportStatusMap.pending ?? 0),
      resolved: Number(supportStatusMap.resolved ?? 0),
      closed: Number(supportStatusMap.closed ?? 0),
    },
    periodMetrics: {
      users: Number(periodUsersRow?.value ?? 0),
      ads: Number(periodAdsRow?.value ?? 0),
      reports: Number(periodReportsRow?.value ?? 0),
      supportTickets: Number(periodSupportRow?.value ?? 0),
      views: Number(periodViewsRow?.value ?? 0),
    },
    topCities: topCitiesRows.map((row) => ({
      city: row.city || "غير محدد",
      adsCount: Number(row.adsCount ?? 0),
      totalViews: Number(row.totalViews ?? 0),
    })),
    topCategories: topCategoriesRows.map((row) => ({
      id: row.id,
      name: row.name,
      adsCount: Number(row.adsCount ?? 0),
      totalViews: Number(row.totalViews ?? 0),
    })),
    topAds: topAdsRows.map((row) => ({
      id: row.id,
      title: row.title,
      views: Number(row.views ?? 0),
      city: row.city,
      status: row.status,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
  });
});

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  const [settings] = await db
    .select({
      appName: appSettingsTable.appName,
      appVersion: appSettingsTable.appVersion,
      supportEmail: appSettingsTable.supportEmail,
      requireAdApproval: appSettingsTable.requireAdApproval,
      reportsEnabled: appSettingsTable.reportsEnabled,
      supportEnabled: appSettingsTable.supportEnabled,
      termsPath: appSettingsTable.termsPath,
      privacyPath: appSettingsTable.privacyPath,
      updatedAt: appSettingsTable.updatedAt,
      updatedByAdminId: appSettingsTable.updatedByAdminId,
      admin2faEnabled: appSettingsTable.admin2faEnabled,
    })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);

  if (!settings) {
    return res.status(500).json({ error: "Settings row is missing" });
  }

  const normalized = {
    appName: normalizeAppName(settings.appName),
    appVersion: normalizeAppVersion(settings.appVersion),
    supportEmail: normalizeSupportEmail(settings.supportEmail),
    termsPath: normalizePathLike(settings.termsPath, SETTINGS_DEFAULTS.termsPath),
    privacyPath: normalizePathLike(settings.privacyPath, SETTINGS_DEFAULTS.privacyPath),
  };

  const needsRepair =
    normalized.appName !== settings.appName ||
    normalized.appVersion !== settings.appVersion ||
    normalized.supportEmail !== settings.supportEmail ||
    normalized.termsPath !== settings.termsPath ||
    normalized.privacyPath !== settings.privacyPath;

  if (needsRepair) {
    await db
      .update(appSettingsTable)
      .set({
        appName: normalized.appName,
        appVersion: normalized.appVersion,
        supportEmail: normalized.supportEmail,
        termsPath: normalized.termsPath,
        privacyPath: normalized.privacyPath,
        updatedAt: new Date(),
      })
      .where(eq(appSettingsTable.id, 1));
  }

  return res.json({
    ...settings,
    ...normalized,
    updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
  });
});

router.patch("/admin/settings", requireAdmin, requireAdminCsrf, async (req, res) => {
  const appName = normalizeAppName(req.body?.appName);
  const appVersion = normalizeAppVersion(req.body?.appVersion);
  const supportEmail = normalizeSupportEmail(req.body?.supportEmail);

  if (!appName) {
    return res.status(400).json({ error: "appName is required" });
  }
  if (!appVersion) {
    return res.status(400).json({ error: "appVersion is required" });
  }
  const requireAdApproval = Boolean(req.body?.requireAdApproval);
  const reportsEnabled = Boolean(req.body?.reportsEnabled);
  const supportEnabled = Boolean(req.body?.supportEnabled);
  const termsPath = normalizePathLike(req.body?.termsPath, SETTINGS_DEFAULTS.termsPath);
  const privacyPath = normalizePathLike(req.body?.privacyPath, SETTINGS_DEFAULTS.privacyPath);
  const actorAdminId = getAdminActorId(req);

  const [before] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);

  const [updated] = await db
    .update(appSettingsTable)
    .set({
      appName,
      appVersion,
      supportEmail,
      requireAdApproval,
      reportsEnabled,
      supportEnabled,
      termsPath,
      privacyPath,
      updatedAt: new Date(),
      updatedByAdminId: actorAdminId,
    })
    .where(eq(appSettingsTable.id, 1))
    .returning({
      appName: appSettingsTable.appName,
      appVersion: appSettingsTable.appVersion,
      supportEmail: appSettingsTable.supportEmail,
      requireAdApproval: appSettingsTable.requireAdApproval,
      reportsEnabled: appSettingsTable.reportsEnabled,
      supportEnabled: appSettingsTable.supportEnabled,
      termsPath: appSettingsTable.termsPath,
      privacyPath: appSettingsTable.privacyPath,
      updatedAt: appSettingsTable.updatedAt,
      updatedByAdminId: appSettingsTable.updatedByAdminId,
    });

  await logAdminActivity({
    action: "settings.update",
    actorAdminId,
    targetType: "system",
    targetId: 1,
    details: {
      appVersionFrom: String(before?.appVersion ?? ""),
      appVersionTo: appVersion,
      supportEmailFrom: String(before?.supportEmail ?? ""),
      supportEmailTo: supportEmail,
      reportsEnabled: reportsEnabled ? "true" : "false",
      supportEnabled: supportEnabled ? "true" : "false",
    },
  });

  return res.json({
    ...updated,
    updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
  });
});

router.post("/admin/change-password", requireAdmin, requireAdminCsrf, async (req, res) => {
  const body = req.body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (!validateStrongPassword(newPassword)) {
    return res.status(400).json({
      error:
        "كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل، وحرف كبير وحرف صغير ورقم ورمز خاص",
    });
  }

  const [settings] = await db
    .select({
      id: appSettingsTable.id,
      adminPasswordHash: appSettingsTable.adminPasswordHash,
    })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);

  if (!settings?.adminPasswordHash) {
    return res.status(500).json({ error: "Admin password is not configured" });
  }

  const currentPasswordValid = await bcrypt.compare(
    currentPassword,
    settings.adminPasswordHash,
  );
  if (!currentPasswordValid) {
    return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 12);
  const actorAdminId = getAdminActorId(req);

  await db
    .update(appSettingsTable)
    .set({
      adminPasswordHash: nextPasswordHash,
      updatedAt: new Date(),
      updatedByAdminId: actorAdminId,
    })
    .where(eq(appSettingsTable.id, 1));

  await bumpAdminSecurityRevision();

  await logAdminActivity({
    action: "admin.password.change",
    actorAdminId,
    targetType: "system",
    targetId: 1,
    details: {
      forcedReauth: "true",
    },
  });

  await new Promise<void>((resolve) => {
    req.session.destroy(() => {
      res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
      res.json({ ok: true, reauthRequired: true });
      resolve();
    });
  });
  return;
});

router.get("/admin/reports", requireAdmin, async (_req, res) => {
  const reportReporter = alias(usersTable, "admin_reports_list_reporter");
  const reportAdOwner = alias(usersTable, "admin_reports_list_ad_owner");
  const reportTargetUser = alias(usersTable, "admin_reports_list_target_user");

  const reports = await db
    .select({
      id: reportsTable.id,
      reporterId: reportsTable.reporterId,
      reporterName: reportReporter.name,
      reporterEmail: reportReporter.email,
      reporterAvatarUrl: reportReporter.avatarUrl,
      targetUserId: reportsTable.targetUserId,
      targetAdId: reportsTable.targetAdId,
      relatedConversationId: reportsTable.relatedConversationId,
      reason: reportsTable.reason,
      description: reportsTable.description,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
      targetAdTitle: adsTable.title,
      targetAdSellerName: adsTable.sellerName,
      targetAdOwnerAvatarUrl: reportAdOwner.avatarUrl,
      targetAdOwnerName: reportAdOwner.name,
      targetProfileName: reportTargetUser.name,
      targetProfileAvatarUrl: reportTargetUser.avatarUrl,
    })
    .from(reportsTable)
    .leftJoin(reportReporter, eq(reportReporter.id, reportsTable.reporterId))
    .leftJoin(adsTable, eq(adsTable.id, reportsTable.targetAdId))
    .leftJoin(reportAdOwner, eq(reportAdOwner.id, adsTable.userId))
    .leftJoin(reportTargetUser, eq(reportTargetUser.id, reportsTable.targetUserId))
    .orderBy(desc(reportsTable.createdAt));

  return res.json(
    reports.map((report) => ({
      ...report,
      targetType: report.targetAdId
        ? "ad"
        : report.targetUserId
          ? "user"
          : report.relatedConversationId
            ? "conversation"
            : "unknown",
      createdAt: report.createdAt ? report.createdAt.toISOString() : null,
    })),
  );
});

router.patch("/admin/reports/:id/status", requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const status = String(req.body?.status || "").trim();
  const allowed = ["pending", "in_review", "resolved", "rejected"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const [before] = await db
    .select({
      id: reportsTable.id,
      reporterId: reportsTable.reporterId,
      status: reportsTable.status,
      targetAdId: reportsTable.targetAdId,
      targetUserId: reportsTable.targetUserId,
      relatedConversationId: reportsTable.relatedConversationId,
    })
    .from(reportsTable)
    .where(eq(reportsTable.id, id))
    .limit(1);

  if (!before) {
    return res.status(404).json({ error: "Report not found" });
  }

  const updated = await db
    .update(reportsTable)
    .set({ status })
    .where(eq(reportsTable.id, id))
    .returning({ id: reportsTable.id, status: reportsTable.status });

  const action =
    status === "resolved"
      ? "report.resolve"
      : status === "in_review"
        ? "report.review"
        : status === "rejected" || status === "ignored"
          ? "report.ignore"
          : "report.update_status";

  await logAdminActivity({
    action,
    actorAdminId: getAdminActorId(req),
    targetType: "report",
    targetId: id,
    details: {
      fromStatus: before.status,
      toStatus: status,
      targetType: before.targetAdId
        ? "ad"
        : before.targetUserId
          ? "user"
          : before.relatedConversationId
            ? "conversation"
            : "unknown",
      targetId:
        before.targetAdId ?? before.targetUserId ?? before.relatedConversationId ?? null,
    },
  });

  const payload = reportStatusNotificationPayload(status);
  if (payload && before.reporterId) {
    try {
      await createNotification({
        userId: before.reporterId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: "report",
        entityId: id,
        metadata: {
          reportId: id,
          fromStatus: before.status,
          toStatus: status,
          targetType: before.targetAdId
            ? "ad"
            : before.targetUserId
              ? "user"
              : before.relatedConversationId
                ? "conversation"
                : "unknown",
          targetId: before.targetAdId ?? before.targetUserId ?? before.relatedConversationId ?? null,
        },
      });
    } catch (err) {
      logger.warn({ err, reportId: id, status }, "createNotification failed (admin report status)");
    }
  }

  return res.json(updated[0]);
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all").trim().toLowerCase();

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
      isBanned: usersTable.isBanned,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(
      and(
        status === "active"
          ? eq(usersTable.isBanned, false)
          : status === "banned"
            ? eq(usersTable.isBanned, true)
            : undefined,
        q
          ? or(
              ilike(usersTable.name, `%${q}%`),
              ilike(usersTable.email, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(usersTable.createdAt));

  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      status: row.isBanned ? "banned" : "active",
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
  );
});

router.get("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      city: usersTable.city,
      avatarUrl: usersTable.avatarUrl,
      isBanned: usersTable.isBanned,
      emailVerified: usersTable.emailVerified,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const [adsCountRow] = await db
    .select({ value: count(adsTable.id) })
    .from(adsTable)
    .where(eq(adsTable.userId, id));
  const [reportsCountRow] = await db
    .select({ value: count(reportsTable.id) })
    .from(reportsTable)
    .where(eq(reportsTable.targetUserId, id));
  const [supportCountRow] = await db
    .select({ value: count(supportTicketsTable.id) })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, id));

  const ads = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      status: adsTable.status,
      city: adsTable.city,
      views: adsTable.views,
      createdAt: adsTable.createdAt,
    })
    .from(adsTable)
    .where(eq(adsTable.userId, id))
    .orderBy(desc(adsTable.createdAt))
    .limit(50);

  const reports = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
      description: reportsTable.description,
      status: reportsTable.status,
      targetAdId: reportsTable.targetAdId,
      reporterName: usersTable.name,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(usersTable.id, reportsTable.reporterId))
    .where(eq(reportsTable.targetUserId, id))
    .orderBy(desc(reportsTable.createdAt))
    .limit(20);

  const supportTickets = await db
    .select({
      id: supportTicketsTable.id,
      category: supportTicketsTable.category,
      subject: supportTicketsTable.subject,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      createdAt: supportTicketsTable.createdAt,
    })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, id))
    .orderBy(desc(supportTicketsTable.createdAt))
    .limit(20);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      status: user.isBanned ? "banned" : "active",
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    },
    stats: {
      adsCount: Number(adsCountRow?.value ?? 0),
      reportsCount: Number(reportsCountRow?.value ?? 0),
      supportTicketsCount: Number(supportCountRow?.value ?? 0),
    },
    ads: ads.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    reports: reports.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    supportTickets: supportTickets.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
  });
});

router.patch("/admin/users/:id", requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const status = String(req.body?.status || "").trim().toLowerCase();
  if (!["active", "banned"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const [before] = await db
    .select({ id: usersTable.id, isBanned: usersTable.isBanned })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!before) {
    return res.status(404).json({ error: "User not found" });
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isBanned: status === "banned" })
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      isBanned: usersTable.isBanned,
      createdAt: usersTable.createdAt,
    });

  if (status === "banned") {
    await db.execute(sql`delete from user_sessions where sess::jsonb->>'userId' = ${String(id)}`);
  }

  await logAdminActivity({
    action: status === "banned" ? "user.block" : "user.unblock",
    actorAdminId: getAdminActorId(req),
    targetType: "user",
    targetId: id,
    details: {
      fromStatus: before.isBanned ? "banned" : "active",
      toStatus: status,
    },
  });

  return res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    status: updated.isBanned ? "banned" : "active",
    createdAt: updated.createdAt ? updated.createdAt.toISOString() : null,
  });
});

router.get("/admin/logs", requireAdmin, async (req, res) => {
  await ensureAdminLogsReady();

  const actionType = String(req.query.actionType || "all").trim().toLowerCase();
  const targetType = String(req.query.targetType || "all").trim().toLowerCase();
  const q = String(req.query.q || "").trim();
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();

  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;

  const actionGroups: Record<string, string[]> = {
    ad: ["ad.approve", "ad.reject", "ad.hide", "ad.unhide", "ad.delete"],
    report: ["report.resolve", "report.review", "report.ignore", "report.update_status"],
    support: ["support.close", "support.resolve", "support.update"],
    user: ["user.block", "user.unblock"],
    category: ["category.create", "category.update", "category.hide", "category.unhide", "category.delete"],
    city: ["city.create", "city.update", "city.hide", "city.unhide", "city.delete"],
    settings: ["settings.update", "admin.password.change", "admin.2fa.enable", "admin.2fa.disable"],
  };

  const where = and(
    actionType === "all"
      ? undefined
      : actionGroups[actionType]
        ? inArray(adminActivityLogsTable.action, actionGroups[actionType]!)
        : eq(adminActivityLogsTable.action, actionType),
    targetType === "all" ? undefined : eq(adminActivityLogsTable.targetType, targetType),
    fromDate && !Number.isNaN(fromDate.getTime())
      ? gte(adminActivityLogsTable.createdAt, fromDate)
      : undefined,
    toDate && !Number.isNaN(toDate.getTime())
      ? sql`${adminActivityLogsTable.createdAt} <= ${toDate}`
      : undefined,
    q
      ? or(
          ilike(adminActivityLogsTable.action, `%${q}%`),
          sql`${adminActivityLogsTable.details}::text ilike ${`%${q}%`}`,
          sql`cast(${adminActivityLogsTable.targetId} as text) ilike ${`%${q}%`}`,
          sql`cast(${adminActivityLogsTable.actorAdminId} as text) ilike ${`%${q}%`}`,
        )
      : undefined,
  );

  const rows = await db
    .select({
      id: adminActivityLogsTable.id,
      action: adminActivityLogsTable.action,
      actorAdminId: adminActivityLogsTable.actorAdminId,
      targetType: adminActivityLogsTable.targetType,
      targetId: adminActivityLogsTable.targetId,
      details: adminActivityLogsTable.details,
      createdAt: adminActivityLogsTable.createdAt,
    })
    .from(adminActivityLogsTable)
    .where(where)
    .orderBy(desc(adminActivityLogsTable.createdAt))
    .limit(300);

  return res.json(
    rows.map((row) => ({
      id: row.id,
      actionType: row.action,
      actor: row.actorAdminId !== null ? `admin#${row.actorAdminId}` : "admin#unknown",
      targetType: row.targetType,
      targetId: row.targetId,
      details:
        row.details && typeof row.details === "object"
          ? JSON.stringify(row.details)
          : String(row.details ?? ""),
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
  );
});

router.get("/admin/categories", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all").trim().toLowerCase();

  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      icon: categoriesTable.icon,
      subtitle: categoriesTable.subtitle,
      sortOrder: categoriesTable.sortOrder,
      isHidden: categoriesTable.isHidden,
      adsCount: count(adsTable.id),
    })
    .from(categoriesTable)
    .leftJoin(adsTable, eq(adsTable.categoryId, categoriesTable.id))
    .where(
      and(
        status === "active"
          ? eq(categoriesTable.isHidden, false)
          : status === "hidden"
            ? eq(categoriesTable.isHidden, true)
            : undefined,
        q
          ? or(
              ilike(categoriesTable.name, `%${q}%`),
              ilike(categoriesTable.slug, `%${q}%`),
              ilike(categoriesTable.subtitle, `%${q}%`),
            )
          : undefined,
      ),
    )
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.sortOrder, categoriesTable.id);

  const subcategories = await db
    .select({
      id: subcategoriesTable.id,
      categoryId: subcategoriesTable.categoryId,
      name: subcategoriesTable.name,
      sortOrder: subcategoriesTable.sortOrder,
      isHidden: subcategoriesTable.isHidden,
      adsCount: count(adsTable.id),
    })
    .from(subcategoriesTable)
    .leftJoin(adsTable, eq(adsTable.subcategoryId, subcategoriesTable.id))
    .groupBy(subcategoriesTable.id)
    .orderBy(subcategoriesTable.sortOrder, subcategoriesTable.id);

  const byCategory = new Map<number, typeof subcategories>();
  for (const sub of subcategories) {
    const list = byCategory.get(sub.categoryId) ?? [];
    list.push(sub);
    byCategory.set(sub.categoryId, list);
  }

  return res.json(
    categories.map((category) => ({
      ...category,
      status: category.isHidden ? "hidden" : "active",
      adsCount: Number(category.adsCount ?? 0),
      subcategories: (byCategory.get(category.id) ?? []).map((sub) => ({
        id: sub.id,
        categoryId: sub.categoryId,
        name: sub.name,
        sortOrder: sub.sortOrder,
        isHidden: sub.isHidden,
        status: sub.isHidden ? "hidden" : "active",
        adsCount: Number(sub.adsCount ?? 0),
      })),
    })),
  );
});

router.post("/admin/categories", requireAdmin, requireAdminCsrf, async (req, res) => {
  const type = String(req.body?.type || "category").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Category name is required" });
  }
  const actorAdminId = getAdminActorId(req);

  if (type === "subcategory") {
    const categoryId = Number(req.body?.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ error: "Valid categoryId is required" });
    }
    const [parent] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .limit(1);
    if (!parent) return res.status(404).json({ error: "Parent category not found" });

    const sortOrder = Number(req.body?.sortOrder);
    const [created] = await db
      .insert(subcategoriesTable)
      .values({
        categoryId,
        name,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .returning();
    await logAdminActivity({
      action: "category.create",
      actorAdminId,
      targetType: "category",
      targetId: created.id,
      details: { entityType: "subcategory", parentCategoryId: categoryId, name },
    });
    return res.status(201).json({
      id: created.id,
      categoryId: created.categoryId,
      name: created.name,
      sortOrder: created.sortOrder,
      isHidden: created.isHidden,
      status: created.isHidden ? "hidden" : "active",
    });
  }

  const requestedSlug = String(req.body?.slug || "").trim();
  const slug = toSlug(requestedSlug || name);
  if (!slug) return res.status(400).json({ error: "Valid slug is required" });
  const icon = String(req.body?.icon || "Tag").trim() || "Tag";
  const subtitle = String(req.body?.subtitle || "").trim() || name;
  const sortOrder = Number(req.body?.sortOrder);

  try {
    const [created] = await db
      .insert(categoriesTable)
      .values({
        name,
        slug,
        icon,
        subtitle,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .returning();
    await logAdminActivity({
      action: "category.create",
      actorAdminId,
      targetType: "category",
      targetId: created.id,
      details: { entityType: "category", name, slug },
    });
    return res.status(201).json({
      ...created,
      status: created.isHidden ? "hidden" : "active",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("categories_slug_key")) {
      return res.status(409).json({ error: "Slug already exists" });
    }
    throw error;
  }
});

router.patch("/admin/categories/:id", requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const type = String(req.body?.type || "category").trim().toLowerCase();
  const actorAdminId = getAdminActorId(req);

  if (type === "subcategory") {
    const [before] = await db
      .select()
      .from(subcategoriesTable)
      .where(eq(subcategoriesTable.id, id))
      .limit(1);
    if (!before) return res.status(404).json({ error: "Subcategory not found" });

    const name = req.body?.name ? String(req.body.name).trim() : before.name;
    const categoryId = req.body?.categoryId ? Number(req.body.categoryId) : before.categoryId;
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder))
      ? Number(req.body.sortOrder)
      : before.sortOrder;
    const isHidden =
      typeof req.body?.isHidden === "boolean" ? req.body.isHidden : before.isHidden;

    const [updated] = await db
      .update(subcategoriesTable)
      .set({ name, categoryId, sortOrder, isHidden })
      .where(eq(subcategoriesTable.id, id))
      .returning();

    const action =
      before.isHidden !== updated.isHidden
        ? updated.isHidden
          ? "category.hide"
          : "category.unhide"
        : "category.update";
    await logAdminActivity({
      action,
      actorAdminId,
      targetType: "category",
      targetId: id,
      details: { entityType: "subcategory", fromHidden: before.isHidden, toHidden: updated.isHidden },
    });

    return res.json({
      id: updated.id,
      categoryId: updated.categoryId,
      name: updated.name,
      sortOrder: updated.sortOrder,
      isHidden: updated.isHidden,
      status: updated.isHidden ? "hidden" : "active",
    });
  }

  const [before] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);
  if (!before) return res.status(404).json({ error: "Category not found" });

  const name = req.body?.name ? String(req.body.name).trim() : before.name;
  const slugRaw = req.body?.slug ? String(req.body.slug).trim() : before.slug;
  const slug = toSlug(slugRaw || name);
  const icon = req.body?.icon ? String(req.body.icon).trim() : before.icon;
  const subtitle = req.body?.subtitle ? String(req.body.subtitle).trim() : before.subtitle;
  const sortOrder = Number.isFinite(Number(req.body?.sortOrder))
    ? Number(req.body.sortOrder)
    : before.sortOrder;
  const isHidden =
    typeof req.body?.isHidden === "boolean" ? req.body.isHidden : before.isHidden;

  try {
    const [updated] = await db
      .update(categoriesTable)
      .set({
        name,
        slug,
        icon,
        subtitle,
        sortOrder,
        isHidden,
      })
      .where(eq(categoriesTable.id, id))
      .returning();

    const action =
      before.isHidden !== updated.isHidden
        ? updated.isHidden
          ? "category.hide"
          : "category.unhide"
        : "category.update";
    await logAdminActivity({
      action,
      actorAdminId,
      targetType: "category",
      targetId: id,
      details: { entityType: "category", fromHidden: before.isHidden, toHidden: updated.isHidden },
    });

    return res.json({
      ...updated,
      status: updated.isHidden ? "hidden" : "active",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("categories_slug_key")) {
      return res.status(409).json({ error: "Slug already exists" });
    }
    throw error;
  }
});

router.delete("/admin/categories/:id", requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const type = String(req.query.type || "category").trim().toLowerCase();
  const actorAdminId = getAdminActorId(req);

  if (type === "subcategory") {
    const [existing] = await db
      .select({ id: subcategoriesTable.id, name: subcategoriesTable.name })
      .from(subcategoriesTable)
      .where(eq(subcategoriesTable.id, id))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Subcategory not found" });
    const [usedRow] = await db
      .select({ value: count(adsTable.id) })
      .from(adsTable)
      .where(eq(adsTable.subcategoryId, id));
    if (Number(usedRow?.value ?? 0) > 0) {
      return res.status(409).json({ error: "Subcategory is used by ads; hide it instead" });
    }
    await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id));
    await logAdminActivity({
      action: "category.delete",
      actorAdminId,
      targetType: "category",
      targetId: id,
      details: { entityType: "subcategory", name: existing.name },
    });
    return res.json({ ok: true });
  }

  const [existing] = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Category not found" });

  const [usedRow] = await db
    .select({ value: count(adsTable.id) })
    .from(adsTable)
    .where(eq(adsTable.categoryId, id));
  if (Number(usedRow?.value ?? 0) > 0) {
    return res.status(409).json({ error: "Category is used by ads; hide it instead" });
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  await logAdminActivity({
    action: "category.delete",
    actorAdminId,
    targetType: "category",
    targetId: id,
    details: { entityType: "category", name: existing.name },
  });
  return res.json({ ok: true });
});

router.get("/admin/cities", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const countryCode = String(req.query.countryCode || "all")
    .trim()
    .toUpperCase();
  const status = String(req.query.status || "all").trim().toLowerCase();

  const rows = await db
    .select({
      id: citiesTable.id,
      name: citiesTable.name,
      countryCode: citiesTable.countryCode,
      countryName: citiesTable.countryName,
      isHidden: citiesTable.isHidden,
      adsCount: count(adsTable.id),
      createdAt: citiesTable.createdAt,
      updatedAt: citiesTable.updatedAt,
    })
    .from(citiesTable)
    .leftJoin(adsTable, eq(adsTable.city, citiesTable.name))
    .where(
      and(
        countryCode !== "ALL" ? eq(citiesTable.countryCode, countryCode) : undefined,
        status === "active"
          ? eq(citiesTable.isHidden, false)
          : status === "hidden"
            ? eq(citiesTable.isHidden, true)
            : undefined,
        q
          ? or(
              ilike(citiesTable.name, `%${q}%`),
              ilike(citiesTable.countryName, `%${q}%`),
              ilike(citiesTable.countryCode, `%${q}%`),
            )
          : undefined,
      ),
    )
    .groupBy(citiesTable.id)
    .orderBy(asc(citiesTable.countryName), asc(citiesTable.name), asc(citiesTable.id));

  const countries = Array.from(
    new Map(
      rows.map((row) => [
        row.countryCode,
        { code: row.countryCode, name: row.countryName },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return res.json({
    countries,
    cities: rows.map((row) => ({
      id: row.id,
      name: row.name,
      countryCode: row.countryCode,
      countryName: row.countryName,
      isHidden: row.isHidden,
      status: row.isHidden ? "hidden" : "active",
      adsCount: Number(row.adsCount ?? 0),
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    })),
  });
});

router.post("/admin/cities", requireAdmin, requireAdminCsrf, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const countryCode = String(req.body?.countryCode || "")
    .trim()
    .toUpperCase();
  const countryName = String(req.body?.countryName || "").trim();
  if (!name || !countryCode || !countryName) {
    return res.status(400).json({ error: "City name, countryCode and countryName are required" });
  }

  const [existing] = await db
    .select({
      id: citiesTable.id,
      name: citiesTable.name,
      countryCode: citiesTable.countryCode,
      isHidden: citiesTable.isHidden,
    })
    .from(citiesTable)
    .where(
      and(
        sql`lower(${citiesTable.name}) = lower(${name})`,
        sql`lower(${citiesTable.countryCode}) = lower(${countryCode})`,
      ),
    )
    .limit(1);

  if (existing) {
    return res.status(409).json({
      error: "City already exists",
      existing: {
        id: existing.id,
        name: existing.name,
        countryCode: existing.countryCode,
        isHidden: existing.isHidden,
      },
    });
  }

  const [created] = await db
    .insert(citiesTable)
    .values({
      name,
      countryCode,
      countryName,
      isHidden: false,
    })
    .returning();

  await logAdminActivity({
    action: "city.create",
    actorAdminId: getAdminActorId(req),
    targetType: "city",
    targetId: created.id,
    details: {
      name: created.name,
      countryCode: created.countryCode,
      countryName: created.countryName,
      isHidden: created.isHidden,
    },
  });

  return res.status(201).json({
    id: created.id,
    name: created.name,
    countryCode: created.countryCode,
    countryName: created.countryName,
    isHidden: created.isHidden,
    status: created.isHidden ? "hidden" : "active",
    adsCount: 0,
    createdAt: created.createdAt ? created.createdAt.toISOString() : null,
    updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
  });
});

router.patch("/admin/cities/:id", requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid city id" });
  }

  const [before] = await db.select().from(citiesTable).where(eq(citiesTable.id, id)).limit(1);
  if (!before) {
    return res.status(404).json({ error: "City not found" });
  }

  const nextName = req.body?.name ? String(req.body.name).trim() : before.name;
  const nextCountryCode = req.body?.countryCode
    ? String(req.body.countryCode).trim().toUpperCase()
    : before.countryCode;
  const nextCountryName = req.body?.countryName
    ? String(req.body.countryName).trim()
    : before.countryName;
  const nextIsHidden =
    typeof req.body?.isHidden === "boolean" ? req.body.isHidden : before.isHidden;

  if (!nextName || !nextCountryCode || !nextCountryName) {
    return res.status(400).json({ error: "City name, countryCode and countryName are required" });
  }

  const [duplicate] = await db
    .select({ id: citiesTable.id })
    .from(citiesTable)
    .where(
      and(
        sql`lower(${citiesTable.name}) = lower(${nextName})`,
        sql`lower(${citiesTable.countryCode}) = lower(${nextCountryCode})`,
        sql`${citiesTable.id} <> ${id}`,
      ),
    )
    .limit(1);
  if (duplicate) {
    return res.status(409).json({ error: "Another city with same country already exists" });
  }

  const [updated] = await db
    .update(citiesTable)
    .set({
      name: nextName,
      countryCode: nextCountryCode,
      countryName: nextCountryName,
      isHidden: nextIsHidden,
      updatedAt: new Date(),
    })
    .where(eq(citiesTable.id, id))
    .returning();

  const action =
    before.isHidden !== updated.isHidden
      ? updated.isHidden
        ? "city.hide"
        : "city.unhide"
      : "city.update";

  await logAdminActivity({
    action,
    actorAdminId: getAdminActorId(req),
    targetType: "city",
    targetId: id,
    details: {
      beforeName: before.name,
      beforeCountryCode: before.countryCode,
      beforeCountryName: before.countryName,
      beforeHidden: before.isHidden,
      afterName: updated.name,
      afterCountryCode: updated.countryCode,
      afterCountryName: updated.countryName,
      afterHidden: updated.isHidden,
    },
  });

  const [adsCountRow] = await db
    .select({ value: count(adsTable.id) })
    .from(adsTable)
    .where(eq(adsTable.city, updated.name));

  return res.json({
    id: updated.id,
    name: updated.name,
    countryCode: updated.countryCode,
    countryName: updated.countryName,
    isHidden: updated.isHidden,
    status: updated.isHidden ? "hidden" : "active",
    adsCount: Number(adsCountRow?.value ?? 0),
    createdAt: updated.createdAt ? updated.createdAt.toISOString() : null,
    updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
  });
});

export default router;
