import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  Calendar,
  Eye,
  Flag,
  FolderTree,
  Headphones,
  MapPin,
  Megaphone,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import {
  ADMIN_STAT_CARD_BTN,
  BTN_FIX,
  BTN_SEARCH,
  CARD_SHELL,
  SUB_CARD,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminAnalyticsCharts } from "@/features/admin/components/admin-analytics-charts";
import {
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminStats, useRequireAdmin } from "@/features/admin/hooks";
import { useAdminAccess } from "@/features/admin/access";
import type { AdminStatsPeriod } from "@/features/admin/types";
import { adminIntlLocale, formatAdminDateTime, formatAdminNumber } from "@/features/admin/admin-locale";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

/** مسارات إدارية معروفة — لا روابط وهمية */
const ROUTES = {
  users: "/admin/users",
  ads: "/admin/ads",
  reports: "/admin/reports",
  support: "/admin/support",
  cities: "/admin/cities",
  categories: "/admin/categories",
} as const;

const PERIOD_VALUES: AdminStatsPeriod[] = ["today", "7d", "30d", "all"];

function periodLabel(value: AdminStatsPeriod): string {
  switch (value) {
    case "today":
      return t("p8.admin.stats.today");
    case "7d":
      return t("p8.admin.stats.seven_days");
    case "30d":
      return t("p8.admin.stats.thirty_days");
    case "all":
      return t("p8.admin.stats.all");
    default:
      return value;
  }
}

/**
 * حاوية أقسام الإحصائيات — تسهّل لاحقًا ربط live counters / badges دون إعادة هيكلة الصفحة.
 * [data-admin-stats-section]
 */
function StatsSection({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section data-admin-stats-section={id} className={className}>
      {children}
    </section>
  );
}

function InteractiveStatCard({
  label,
  value,
  icon,
  onNavigate,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  onNavigate?: () => void;
}) {
  const Wrapper = onNavigate ? "button" : "div";
  return (
    <Wrapper
      type={onNavigate ? "button" : undefined}
      onClick={onNavigate}
      className={onNavigate ? ADMIN_STAT_CARD_BTN : cn(CARD_SHELL, "p-4 text-right")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-xl border border-primary/30 bg-zinc-900/90 p-2 text-primary shadow-[0_0_12px_-6px_hsl(var(--primary)/0.35)]">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {formatAdminNumber(value, getLocale())}
      </p>
    </Wrapper>
  );
}

function SummaryNavCard({
  title,
  lines,
  onNavigate,
}: {
  title: string;
  lines: Array<{ label: string; value: number }>;
  onNavigate?: () => void;
}) {
  if (!onNavigate) {
    return (
      <div className={cn(CARD_SHELL, "w-full p-4 text-right")}>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
        <div className="space-y-2 text-sm">
          {lines.map((line) => (
            <p key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted-foreground">{line.label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {line.value.toLocaleString(adminIntlLocale(getLocale()))}
              </span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onNavigate}
      className={cn(ADMIN_STAT_CARD_BTN, "w-full p-4 text-right")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs font-medium text-primary">{t("p8.admin.stats.manage")}</span>
      </div>
      <div className="space-y-2 text-sm">
        {lines.map((line) => (
          <p key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {line.value.toLocaleString(adminIntlLocale(getLocale()))}
            </span>
          </p>
        ))}
      </div>
    </button>
  );
}

function SectionHeaderLink({
  title,
  href,
}: {
  title: string;
  href: (typeof ROUTES)[keyof typeof ROUTES];
}) {
  const [, navigate] = useLocation();
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <button
        type="button"
        onClick={() => navigate(href)}
        className={cn(
          BTN_FIX,
          "shrink-0 cursor-pointer rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-all duration-150 ease-out hover:border-primary/50 hover:bg-primary/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        {t("p8.admin.stats.manage")}
      </button>
    </div>
  );
}

export default function AdminStatsPage() {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();
  const [period, setPeriod] = useState<AdminStatsPeriod>("30d");
  const statsQuery = useAdminStats(period);
  const canManage = (area: "users" | "ads" | "reports" | "support" | "cities" | "categories") =>
    access.can(area);

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground">
        {t("p8.admin.stats.loading")}
      </div>
    );
  }

  const data = statsQuery.data;

  const chartData = useMemo(() => {
    if (!data) return null;
    return {
      adsStatusData: [
        { name: t("p8.admin.stats.pending_review"), key: "pending", value: data.ads.pending },
        { name: t("p8.admin.stats.approved"), key: "approved", value: data.ads.approved },
        { name: t("p8.admin.stats.rejected"), key: "rejected", value: data.ads.rejected },
        { name: t("p8.admin.stats.hidden"), key: "hidden", value: data.ads.hidden },
      ],
      periodBarData: [
        { name: t("p8.admin.stats.users"), value: data.periodMetrics.users },
        { name: t("p8.admin.stats.ads"), value: data.periodMetrics.ads },
        { name: t("p8.admin.stats.reports"), value: data.periodMetrics.reports },
        { name: t("p8.admin.stats.support"), value: data.periodMetrics.supportTickets },
        { name: t("p8.admin.stats.views_period"), value: data.periodMetrics.views },
      ],
      periodLabel: periodLabel(period),
      adsByStatusTitle: t("p8.admin.stats.ads_by_status"),
      periodMetricsTitle: t("p8.admin.stats.period_metrics"),
      manageLabel: t("p8.admin.stats.manage"),
      adUnit: t("p8.admin.stats.ad_unit"),
      onManageAds: () => navigate(ROUTES.ads),
    };
  }, [data, navigate, period]);

  const generatedLabel = data?.generatedAt
    ? formatAdminDateTime(data.generatedAt, getLocale(), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <AdminShell activeKey="analytics" onLogout={handleLogout}>
      <div
        className={cn("space-y-5", statsQuery.isFetching && data && "opacity-[0.92] transition-opacity")}
       
      >
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("p8.admin.stats.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("p8.admin.stats.subtitle")}</p>
            {generatedLabel ? (
              <p className="text-xs text-muted-foreground/90">
                {t("p8.admin.stats.generated_prefix")}{" "}
                <span className="tabular-nums text-foreground/90">{generatedLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => statsQuery.refetch()}
                disabled={statsQuery.isFetching}
                title={statsQuery.isFetching ? t("p8.admin.noc.refreshing") : undefined}
                className={cn(
                  BTN_SEARCH,
                  "inline-flex items-center gap-2 border border-primary/35 bg-zinc-900/90 px-3 py-2 text-sm font-medium text-foreground shadow-[0_0_16px_-8px_hsl(var(--primary)/0.25)]",
                )}
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", statsQuery.isFetching && "animate-spin")} aria-hidden />
                {t("p8.admin.stats.refresh")}
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {PERIOD_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={adminPillBtn(period === value)}
                >
                  {periodLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </header>

        {statsQuery.isLoading && !data ? (
          <AdminPageLoading message={t("p8.admin.stats.loading_stats")} />
        ) : statsQuery.isError || !data ? (
          <AdminErrorState
            description={t("p8.admin.stats.error_stats")}
            onRetry={() => statsQuery.refetch()}
            retryLabel={t("p8.admin.stats.retry")}
          />
        ) : (
          <>
            {data.analyticsFoundation ? (
              <StatsSection id="foundation">
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <InteractiveStatCard
                    label={t("p8.admin.stats.messages_today")}
                    value={data.analyticsFoundation.messagesToday}
                    icon={<TrendingUp className="h-4 w-4" aria-hidden />}
                  />
                  <InteractiveStatCard
                    label={t("p8.admin.stats.reports_today")}
                    value={data.analyticsFoundation.reportsToday}
                    icon={<Flag className="h-4 w-4" aria-hidden />}
                    onNavigate={canManage("reports") ? () => navigate(ROUTES.reports) : undefined}
                  />
                  <InteractiveStatCard
                    label={t("p8.admin.stats.report_resolution_rate")}
                    value={data.analyticsFoundation.reportResolutionRatePct ?? 0}
                    icon={<BarChart3 className="h-4 w-4" aria-hidden />}
                  />
                  <InteractiveStatCard
                    label={t("p8.admin.stats.support_resolution_rate")}
                    value={data.analyticsFoundation.supportResolutionRatePct ?? 0}
                    icon={<Headphones className="h-4 w-4" aria-hidden />}
                    onNavigate={canManage("support") ? () => navigate(ROUTES.support) : undefined}
                  />
                </section>
              </StatsSection>
            ) : null}

            <StatsSection id="kpis">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InteractiveStatCard
                  label={t("p8.admin.stats.users_total")}
                  value={data.totals.users}
                  icon={<Users className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("users") ? () => navigate(ROUTES.users) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.ads_total")}
                  value={data.totals.ads}
                  icon={<Megaphone className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("ads") ? () => navigate(ROUTES.ads) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.reports_total")}
                  value={data.totals.reports}
                  icon={<Flag className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("reports") ? () => navigate(ROUTES.reports) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.support_total")}
                  value={data.totals.supportTickets}
                  icon={<Headphones className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("support") ? () => navigate(ROUTES.support) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.views_total")}
                  value={data.totals.views}
                  icon={<Eye className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("ads") ? () => navigate(ROUTES.ads) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.cities_total")}
                  value={data.totals.cities}
                  icon={<MapPin className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("cities") ? () => navigate(ROUTES.cities) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.categories_total")}
                  value={data.totals.categories}
                  icon={<FolderTree className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("categories") ? () => navigate(ROUTES.categories) : undefined}
                />
                <InteractiveStatCard
                  label={t("p8.admin.stats.ads_today")}
                  value={data.ads.publishedToday}
                  icon={<Calendar className="h-4 w-4" aria-hidden />}
                  onNavigate={canManage("ads") ? () => navigate(ROUTES.ads) : undefined}
                />
              </section>
            </StatsSection>

            <StatsSection id="summaries">
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <SummaryNavCard
                  title={t("p8.admin.stats.users_growth")}
                  onNavigate={canManage("users") ? () => navigate(ROUTES.users) : undefined}
                  lines={[
                    { label: t("p8.admin.stats.new_today"), value: data.users.newToday },
                    { label: t("p8.admin.stats.new_week"), value: data.users.newWeek },
                    { label: t("p8.admin.stats.new_month"), value: data.users.newMonth },
                  ]}
                />
                <SummaryNavCard
                  title={t("p8.admin.stats.reports_summary")}
                  onNavigate={canManage("reports") ? () => navigate(ROUTES.reports) : undefined}
                  lines={[
                    { label: t("p8.admin.stats.reports_new"), value: data.reports.new },
                    { label: t("p8.admin.stats.in_review"), value: data.reports.inReview },
                    { label: t("p8.admin.stats.open"), value: data.reports.open },
                    { label: t("p8.admin.stats.resolved"), value: data.reports.resolved },
                  ]}
                />
                <SummaryNavCard
                  title={t("p8.admin.stats.support_summary")}
                  onNavigate={canManage("support") ? () => navigate(ROUTES.support) : undefined}
                  lines={[
                    { label: t("p8.admin.stats.open"), value: data.support.open },
                    { label: t("p8.admin.stats.processing"), value: data.support.pending },
                    { label: t("p8.admin.stats.resolved"), value: data.support.resolved },
                    { label: t("p8.admin.stats.closed"), value: data.support.closed },
                  ]}
                />
              </section>
            </StatsSection>

            <StatsSection id="charts">
              {chartData ? <AdminAnalyticsCharts data={chartData} /> : null}
            </StatsSection>

            <StatsSection id="rankings">
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className={cn(CARD_SHELL, "p-4")}>
                  <SectionHeaderLink title={t("p8.admin.stats.top_cities")} href={ROUTES.cities} />
                  <div className="space-y-2">
                    {data.topCities.length === 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 text-sm text-muted-foreground">
                        {t("p8.admin.stats.no_data")}
                      </div>
                    ) : (
                      data.topCities.map((item) => (
                        <div key={item.city} className={cn(SUB_CARD, "p-3 text-sm")}>
                          <p className="font-medium text-foreground">{item.city}</p>
                          <p className="mt-1 text-muted-foreground">
                            <span className="tabular-nums">{item.adsCount.toLocaleString(adminIntlLocale(getLocale()))}</span>{" "}
                            {t("p8.admin.stats.ad_unit")}{" "}
                            <span className="text-primary/80">·</span>{" "}
                            <span className="tabular-nums">{item.totalViews.toLocaleString(adminIntlLocale(getLocale()))}</span>{" "}
                            {t("p8.admin.stats.views_unit")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <SectionHeaderLink title={t("p8.admin.stats.top_categories")} href={ROUTES.categories} />
                  <div className="space-y-2">
                    {data.topCategories.length === 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 text-sm text-muted-foreground">
                        {t("p8.admin.stats.no_data")}
                      </div>
                    ) : (
                      data.topCategories.map((item) => (
                        <div key={item.id} className={cn(SUB_CARD, "p-3 text-sm")}>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="mt-1 text-muted-foreground">
                            <span className="tabular-nums">{item.adsCount.toLocaleString(adminIntlLocale(getLocale()))}</span>{" "}
                            {t("p8.admin.stats.ad_unit")}{" "}
                            <span className="text-primary/80">·</span>{" "}
                            <span className="tabular-nums">{item.totalViews.toLocaleString(adminIntlLocale(getLocale()))}</span>{" "}
                            {t("p8.admin.stats.views_unit")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <SectionHeaderLink title={t("p8.admin.stats.top_ads")} href={ROUTES.ads} />
                  <div className="space-y-2">
                    {data.topAds.length === 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 text-sm text-muted-foreground">
                        {t("p8.admin.stats.no_data")}
                      </div>
                    ) : (
                      data.topAds.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(ROUTES.ads)}
                          className={cn(
                            BTN_FIX,
                            SUB_CARD,
                            "w-full cursor-pointer p-3 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                          )}
                        >
                          <p className="line-clamp-1 font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                            <TrendingUp className="hidden h-3.5 w-3.5 text-primary sm:inline" aria-hidden />
                            <span className="tabular-nums">#{item.id}</span>
                            <span className="text-primary/80">·</span>
                            <span>{item.city || t("p8.admin.common.dash")}</span>
                            <span className="text-primary/80">·</span>
                            <span className="tabular-nums">{item.views.toLocaleString(adminIntlLocale(getLocale()))}</span>{" "}
                            {t("p8.admin.stats.views_unit")}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </StatsSection>
          </>
        )}
      </div>
    </AdminShell>
  );
}
