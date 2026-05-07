import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminStats, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminStatsPeriod } from "@/features/admin/types";
import { cn } from "@/lib/utils";

const TEXT = {
  loading: "جاري التحميل...",
  title: "الإحصائيات",
  subtitle: "قراءة مباشرة من قاعدة البيانات — أرقام فعلية حسب الفترة المختارة",
  loadingStats: "جاري تحميل الإحصائيات...",
  errorStats: "تعذر تحميل الإحصائيات.",
  retry: "إعادة المحاولة",
  noData: "لا توجد بيانات",
  usersTotal: "إجمالي المستخدمين",
  adsTotal: "إجمالي الإعلانات",
  reportsTotal: "إجمالي البلاغات",
  supportTotal: "إجمالي طلبات الدعم",
  viewsTotal: "إجمالي المشاهدات",
  citiesTotal: "المدن المسجّلة",
  categoriesTotal: "الأقسام المسجّلة",
  adsToday: "إعلانات منشورة اليوم",
  usersGrowth: "نمو المستخدمين",
  reportsSummary: "ملخص البلاغات",
  supportSummary: "ملخص الدعم",
  adsByStatus: "الإعلانات حسب الحالة",
  periodMetrics: "مؤشرات الفترة المحددة",
  topCities: "أكثر المدن نشاطًا",
  topCategories: "أكثر الأقسام استخدامًا",
  topAds: "أكثر الإعلانات مشاهدة",
  pendingReview: "قيد المراجعة",
  approved: "مقبولة",
  rejected: "مرفوضة",
  hidden: "مخفية",
  newToday: "جدد اليوم",
  newWeek: "جدد هذا الأسبوع",
  newMonth: "جدد هذا الشهر",
  reportsNew: "بلاغات جديدة (حسب الفترة)",
  open: "مفتوحة",
  resolved: "محلولة",
  inReview: "قيد المراجعة",
  processing: "قيد المعالجة",
  closed: "مغلقة",
  users: "مستخدمون",
  ads: "إعلانات",
  reports: "بلاغات",
  support: "دعم",
  adUnit: "إعلان",
  viewsUnit: "مشاهدة",
  viewsPeriod: "مشاهدات (الفترة)",
  today: "اليوم",
  sevenDays: "آخر 7 أيام",
  thirtyDays: "آخر 30 يوم",
  all: "الكل",
  refresh: "تحديث",
  manage: "إدارة",
  generatedPrefix: "آخر تحديث:",
};

/** مسارات إدارية معروفة — لا روابط وهمية */
const ROUTES = {
  users: "/admin/users",
  ads: "/admin/ads",
  reports: "/admin/reports",
  support: "/admin/support",
  cities: "/admin/cities",
  categories: "/admin/categories",
} as const;

const PERIOD_OPTIONS: Array<{ value: AdminStatsPeriod; label: string }> = [
  { value: "today", label: TEXT.today },
  { value: "7d", label: TEXT.sevenDays },
  { value: "30d", label: TEXT.thirtyDays },
  { value: "all", label: TEXT.all },
];

/** متوافقة مع لوحة التحكم — ألوان حالة الإعلان */
const ADS_STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45 93% 47%)",
  approved: "hsl(142 76% 45%)",
  rejected: "hsl(0 84% 60%)",
  hidden: "hsl(215 16% 47%)",
};

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid hsl(var(--primary) / 0.35)",
  borderRadius: "12px",
  color: "#fafafa",
};

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
        {value.toLocaleString("ar-EG")}
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
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className={cn(ADMIN_STAT_CARD_BTN, "w-full p-4 text-right")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs font-medium text-primary">{TEXT.manage}</span>
      </div>
      <div className="space-y-2 text-sm">
        {lines.map((line) => (
          <p key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {line.value.toLocaleString("ar-EG")}
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
        {TEXT.manage}
      </button>
    </div>
  );
}

export default function AdminStatsPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const [period, setPeriod] = useState<AdminStatsPeriod>("30d");
  const statsQuery = useAdminStats(period);

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground">
        {TEXT.loading}
      </div>
    );
  }

  const data = statsQuery.data;
  const adsStatusData = data
    ? [
        { name: TEXT.pendingReview, key: "pending", value: data.ads.pending },
        { name: TEXT.approved, key: "approved", value: data.ads.approved },
        { name: TEXT.rejected, key: "rejected", value: data.ads.rejected },
        { name: TEXT.hidden, key: "hidden", value: data.ads.hidden },
      ]
    : [];

  const periodBarData = data
    ? [
        { name: TEXT.users, value: data.periodMetrics.users },
        { name: TEXT.ads, value: data.periodMetrics.ads },
        { name: TEXT.reports, value: data.periodMetrics.reports },
        { name: TEXT.support, value: data.periodMetrics.supportTickets },
        { name: TEXT.viewsPeriod, value: data.periodMetrics.views },
      ]
    : [];

  const generatedLabel = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <AdminShell activeKey="stats" onLogout={handleLogout}>
      <div
        className={cn("space-y-5", statsQuery.isFetching && data && "opacity-[0.92] transition-opacity")}
        dir="rtl"
      >
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{TEXT.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{TEXT.subtitle}</p>
            {generatedLabel ? (
              <p className="text-xs text-muted-foreground/90">
                {TEXT.generatedPrefix} <span className="tabular-nums text-foreground/90">{generatedLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => statsQuery.refetch()}
                disabled={statsQuery.isFetching}
                title={statsQuery.isFetching ? "جاري التحديث..." : undefined}
                className={cn(
                  BTN_SEARCH,
                  "inline-flex items-center gap-2 border border-primary/35 bg-zinc-900/90 px-3 py-2 text-sm font-medium text-foreground shadow-[0_0_16px_-8px_hsl(var(--primary)/0.25)]",
                )}
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", statsQuery.isFetching && "animate-spin")} aria-hidden />
                {TEXT.refresh}
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {PERIOD_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={adminPillBtn(period === item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {statsQuery.isLoading && !data ? (
          <div className={cn(CARD_SHELL, "p-8 text-center text-muted-foreground")}>{TEXT.loadingStats}</div>
        ) : statsQuery.isError || !data ? (
          <div className="rounded-2xl border border-red-500/35 bg-red-950/25 p-8 text-center text-red-100 shadow-[0_0_20px_-12px_rgba(239,68,68,0.35)] ring-1 ring-red-500/20">
            <p className="mb-3">{TEXT.errorStats}</p>
            <button
              type="button"
              onClick={() => statsQuery.refetch()}
              className={cn(
                BTN_SEARCH,
                "border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
            >
              {TEXT.retry}
            </button>
          </div>
        ) : (
          <>
            <StatsSection id="kpis">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InteractiveStatCard
                  label={TEXT.usersTotal}
                  value={data.totals.users}
                  icon={<Users className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.users)}
                />
                <InteractiveStatCard
                  label={TEXT.adsTotal}
                  value={data.totals.ads}
                  icon={<Megaphone className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.ads)}
                />
                <InteractiveStatCard
                  label={TEXT.reportsTotal}
                  value={data.totals.reports}
                  icon={<Flag className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.reports)}
                />
                <InteractiveStatCard
                  label={TEXT.supportTotal}
                  value={data.totals.supportTickets}
                  icon={<Headphones className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.support)}
                />
                <InteractiveStatCard
                  label={TEXT.viewsTotal}
                  value={data.totals.views}
                  icon={<Eye className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.ads)}
                />
                <InteractiveStatCard
                  label={TEXT.citiesTotal}
                  value={data.totals.cities}
                  icon={<MapPin className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.cities)}
                />
                <InteractiveStatCard
                  label={TEXT.categoriesTotal}
                  value={data.totals.categories}
                  icon={<FolderTree className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.categories)}
                />
                <InteractiveStatCard
                  label={TEXT.adsToday}
                  value={data.ads.publishedToday}
                  icon={<Calendar className="h-4 w-4" aria-hidden />}
                  onNavigate={() => navigate(ROUTES.ads)}
                />
              </section>
            </StatsSection>

            <StatsSection id="summaries">
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <SummaryNavCard
                  title={TEXT.usersGrowth}
                  onNavigate={() => navigate(ROUTES.users)}
                  lines={[
                    { label: TEXT.newToday, value: data.users.newToday },
                    { label: TEXT.newWeek, value: data.users.newWeek },
                    { label: TEXT.newMonth, value: data.users.newMonth },
                  ]}
                />
                <SummaryNavCard
                  title={TEXT.reportsSummary}
                  onNavigate={() => navigate(ROUTES.reports)}
                  lines={[
                    { label: TEXT.reportsNew, value: data.reports.new },
                    { label: TEXT.inReview, value: data.reports.inReview },
                    { label: TEXT.open, value: data.reports.open },
                    { label: TEXT.resolved, value: data.reports.resolved },
                  ]}
                />
                <SummaryNavCard
                  title={TEXT.supportSummary}
                  onNavigate={() => navigate(ROUTES.support)}
                  lines={[
                    { label: TEXT.open, value: data.support.open },
                    { label: TEXT.processing, value: data.support.pending },
                    { label: TEXT.resolved, value: data.support.resolved },
                    { label: TEXT.closed, value: data.support.closed },
                  ]}
                />
              </section>
            </StatsSection>

            <StatsSection id="charts">
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className={cn(CARD_SHELL, "p-4")}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{TEXT.adsByStatus}</h2>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.ads)}
                      className={cn(
                        BTN_FIX,
                        "cursor-pointer rounded text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:opacity-80",
                      )}
                    >
                      {TEXT.manage}
                    </button>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    توزيع إجمالي الإعلانات حسب الحالة في قاعدة البيانات (ليست مقتصرة على الفترة).
                  </p>
                  {/* محور الرسم LTR لاتساق أشرطة Recharts؛ البيانات من API */}
                  <div className="h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={adsStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {adsStatusData.map((entry) => (
                            <Cell key={entry.key} fill={ADS_STATUS_COLORS[entry.key] || "#71717a"} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          formatter={(value) => <span style={{ color: "#e4e4e7", fontSize: 12 }}>{value}</span>}
                        />
                        <Tooltip
                          formatter={(value: number, _name, item) => [
                            `${Number(value).toLocaleString("ar-EG")} ${TEXT.adUnit}`,
                            String(item?.payload?.name ?? ""),
                          ]}
                          contentStyle={tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <h2 className="mb-1 text-lg font-semibold text-foreground">{TEXT.periodMetrics}</h2>
                  <p className="mb-3 text-xs text-muted-foreground">
                    أعداد الجديد ضمن الفترة المختارة (
                    {PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period}) — من API.
                  </p>
                  <div className="h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={periodBarData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.12)" />
                        <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                        <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => `${Number(value).toLocaleString("ar-EG")}`}
                          contentStyle={tooltipStyle}
                          cursor={{ fill: "hsl(var(--primary) / 0.12)" }}
                        />
                        <Bar
                          dataKey="value"
                          fill="hsl(var(--primary))"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={56}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </StatsSection>

            <StatsSection id="rankings">
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className={cn(CARD_SHELL, "p-4")}>
                  <SectionHeaderLink title={TEXT.topCities} href={ROUTES.cities} />
                  <div className="space-y-2">
                    {data.topCities.length === 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 text-sm text-muted-foreground">
                        {TEXT.noData}
                      </div>
                    ) : (
                      data.topCities.map((item) => (
                        <div key={item.city} className={cn(SUB_CARD, "p-3 text-sm")}>
                          <p className="font-medium text-foreground">{item.city}</p>
                          <p className="mt-1 text-muted-foreground">
                            <span className="tabular-nums">{item.adsCount.toLocaleString("ar-EG")}</span> {TEXT.adUnit}{" "}
                            <span className="text-primary/80">·</span>{" "}
                            <span className="tabular-nums">{item.totalViews.toLocaleString("ar-EG")}</span>{" "}
                            {TEXT.viewsUnit}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <SectionHeaderLink title={TEXT.topCategories} href={ROUTES.categories} />
                  <div className="space-y-2">
                    {data.topCategories.length === 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 text-sm text-muted-foreground">
                        {TEXT.noData}
                      </div>
                    ) : (
                      data.topCategories.map((item) => (
                        <div key={item.id} className={cn(SUB_CARD, "p-3 text-sm")}>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="mt-1 text-muted-foreground">
                            <span className="tabular-nums">{item.adsCount.toLocaleString("ar-EG")}</span> {TEXT.adUnit}{" "}
                            <span className="text-primary/80">·</span>{" "}
                            <span className="tabular-nums">{item.totalViews.toLocaleString("ar-EG")}</span>{" "}
                            {TEXT.viewsUnit}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <SectionHeaderLink title={TEXT.topAds} href={ROUTES.ads} />
                  <div className="space-y-2">
                    {data.topAds.length === 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 text-sm text-muted-foreground">
                        {TEXT.noData}
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
                            <span>{item.city || "—"}</span>
                            <span className="text-primary/80">·</span>
                            <span className="tabular-nums">{item.views.toLocaleString("ar-EG")}</span> {TEXT.viewsUnit}
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
