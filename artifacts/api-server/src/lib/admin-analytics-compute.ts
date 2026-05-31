import {
  db,
  adsTable,
  categoriesTable,
  messagesTable,
  reportsTable,
  supportTicketsTable,
  usersTable,
} from "@workspace/db";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { alias, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export type AdminStatsPeriod = "today" | "7d" | "30d" | "all";

export const ADMIN_STATS_PERIODS: AdminStatsPeriod[] = [
  "today",
  "7d",
  "30d",
  "all",
];

export function parseStatsPeriod(raw: unknown): AdminStatsPeriod {
  const value = String(raw || "all").trim().toLowerCase();
  if (value === "today" || value === "7d" || value === "30d" || value === "all") {
    return value;
  }
  return "all";
}

export function getPeriodStart(period: AdminStatsPeriod): Date | null {
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

export type AdminAnalyticsPayload = {
  period: AdminStatsPeriod;
  generatedAt: string;
  totals: {
    users: number;
    ads: number;
    reports: number;
    supportTickets: number;
    views: number;
    cities: number;
    categories: number;
  };
  users: {
    newToday: number;
    newWeek: number;
    newMonth: number;
  };
  ads: {
    publishedToday: number;
    pending: number;
    approved: number;
    rejected: number;
    hidden: number;
  };
  reports: {
    total: number;
    new: number;
    inReview: number;
    resolved: number;
    open: number;
  };
  support: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  periodMetrics: {
    users: number;
    ads: number;
    reports: number;
    supportTickets: number;
    views: number;
  };
  topCities: Array<{ city: string; adsCount: number; totalViews: number }>;
  topCategories: Array<{
    id: number;
    name: string;
    adsCount: number;
    totalViews: number;
  }>;
  topAds: Array<{
    id: number;
    title: string;
    views: number;
    city: string | null;
    status: string | null;
    createdAt: string | null;
  }>;
  analyticsFoundation: {
    messagesToday: number;
    reportsToday: number;
    reportResolutionRatePct: number | null;
    supportResolutionRatePct: number | null;
    userGrowth: {
      today: number;
      week: number;
      month: number;
    };
  };
};

/** Full admin analytics aggregation (~27 parallel queries). Shared by API and rollup worker. */
export async function computeAdminAnalyticsPayload(
  period: AdminStatsPeriod,
): Promise<AdminAnalyticsPayload> {
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
    messagesTodayRow,
    reportsTodayRow,
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
      .where(inArray(reportsTable.status, ["under_review", "in_review"]))
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
    db
      .select({ value: count(messagesTable.id) })
      .from(messagesTable)
      .where(gte(messagesTable.createdAt, startOfToday))
      .then((rows) => rows[0]),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(gte(reportsTable.createdAt, startOfToday))
      .then((rows) => rows[0]),
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

  const reportsResolvedCount = Number(reportsResolvedRow?.value ?? 0);
  const reportsOpenCount = Number(reportsOpenRow?.value ?? 0);
  const reportsInReviewCount = Number(reportsInReviewRow?.value ?? 0);
  const reportResolutionDenom =
    reportsResolvedCount + reportsOpenCount + reportsInReviewCount;
  const reportResolutionRatePct =
    reportResolutionDenom > 0
      ? Math.round((reportsResolvedCount / reportResolutionDenom) * 1000) / 10
      : null;

  const supportTotalCount = Number(supportTotalRow?.value ?? 0);
  const supportResolvedCount =
    Number(supportStatusMap.resolved ?? 0) + Number(supportStatusMap.closed ?? 0);
  const supportResolutionRatePct =
    supportTotalCount > 0
      ? Math.round((supportResolvedCount / supportTotalCount) * 1000) / 10
      : null;

  return {
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
    analyticsFoundation: {
      messagesToday: Number(messagesTodayRow?.value ?? 0),
      reportsToday: Number(reportsTodayRow?.value ?? 0),
      reportResolutionRatePct,
      supportResolutionRatePct,
      userGrowth: {
        today: Number(usersNewTodayRow?.value ?? 0),
        week: Number(usersNewWeekRow?.value ?? 0),
        month: Number(usersNewMonthRow?.value ?? 0),
      },
    },
  };
}

/** Compute all period variants for daily rollup job. */
export async function computeAllAdminAnalyticsRollups(): Promise<
  AdminAnalyticsPayload[]
> {
  return Promise.all(ADMIN_STATS_PERIODS.map((period) => computeAdminAnalyticsPayload(period)));
}
