import {
  ChevronLeft,
  Eye,
  Flag,
  Headphones,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_STAT_CARD_BTN,
  ADMIN_TABLE_ROW,
  BTN_FIX,
  CARD_SHELL,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
} from "@/features/admin/admin-interaction-classes";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import { AUTH_ACCENT_OUTLINE_BTN, AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { useAdminActiveAppUsersCount } from "../hooks";
import type { AdminDashboardResponse, DashboardReport } from "../types";

type DashboardHomeProps = {
  data: AdminDashboardResponse;
  isRefreshing?: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  approved: "hsl(142 76% 45%)",
  pending: "hsl(45 93% 47%)",
  rejected: "hsl(0 84% 60%)",
  hidden: "hsl(215 16% 47%)",
};

/** عنوان لوحة التحكم داخل كرت/شريحة صغيرة — هوية الكروت */
const ADMIN_DASHBOARD_TITLE_CHIP =
  "min-h-[4.65rem] min-w-0 w-full max-w-full rounded-2xl border border-primary/40 bg-zinc-950/85 px-4 py-3 text-right shadow-[0_0_20px_-10px_hsl(var(--primary)/0.26)] ring-1 ring-primary/12 sm:min-h-[4.85rem] sm:max-w-[min(100%,22.5rem)] sm:px-5 sm:py-3.5";

/** كرت مقياس مباشر (النشطون الآن / مباشر) — نفس المقاس والهوية */
const ADMIN_HEADER_LIVE_METRIC_TILE =
  "flex h-[4.35rem] w-[6.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-primary/40 bg-zinc-950/85 px-2.5 py-2 text-center shadow-[0_0_18px_-10px_hsl(var(--primary)/0.26)] ring-1 ring-primary/12 sm:h-[4.5rem] sm:w-[7rem]";

function mediaSrc(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}

function reportStatusLabel(status: string) {
  if (status === "pending") return "جديد";
  if (status === "in_review") return "قيد المراجعة";
  if (status === "resolved") return "تم الحل";
  if (status === "rejected" || status === "ignored") return "تم التجاهل";
  return status;
}

function reportStatusBadgeClass(status: string) {
  if (status === "pending") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (status === "in_review") return "border-primary/45 bg-primary/15 text-primary";
  if (status === "resolved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected" || status === "ignored") return "border-zinc-600 bg-zinc-800/80 text-zinc-300";
  return "border-zinc-600 bg-zinc-900/70 text-zinc-300";
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").slice(0, 2);
}

function ReportSubjectPreview({ report }: { report: DashboardReport }) {
  const hasAd = report.targetAdId != null && Boolean(report.targetAdTitle?.trim());
  const hasUser = report.targetUserId != null;
  const sellerLine =
    report.targetAdOwnerName?.trim() ||
    report.targetAdSellerName?.trim() ||
    null;

  if (hasAd) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9 border border-primary/25 ring-1 ring-primary/10">
          <AvatarImage src={mediaSrc(report.targetAdOwnerAvatarUrl)} alt="" className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
            {initials(sellerLine || report.targetAdTitle)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-right">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{report.targetAdTitle}</p>
          <p className="text-[11px] text-muted-foreground">
            {sellerLine ? `البائع: ${sellerLine}` : `إعلان #${report.targetAdId}`}
          </p>
        </div>
      </div>
    );
  }

  if (hasUser) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9 border border-primary/25 ring-1 ring-primary/10">
          <AvatarImage src={mediaSrc(report.targetProfileAvatarUrl)} alt="" className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
            {initials(report.targetProfileName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-right">
          <p className="line-clamp-1 text-sm font-medium text-foreground">
            {report.targetProfileName?.trim() || `مستخدم #${report.targetUserId}`}
          </p>
          <p className="text-[11px] text-muted-foreground">بلاغ ضد مستخدم</p>
        </div>
      </div>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

function StatCard({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={ADMIN_STAT_CARD_BTN}
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
    </button>
  );
}

export function DashboardHome({ data, isRefreshing: _isRefreshing = false }: DashboardHomeProps) {
  void _isRefreshing;
  const activeUsersQuery = useAdminActiveAppUsersCount(true);
  const countNum =
    activeUsersQuery.data != null && typeof activeUsersQuery.data.count === "number"
      ? activeUsersQuery.data.count
      : 0;
  const liveCount = countNum.toLocaleString("ar-EG");
  const [, navigate] = useLocation();
  const totals = data?.totals ?? { users: 0, ads: 0, reports: 0, views: 0 };
  const highlights = {
    adsPendingReview: Number(data?.highlights?.adsPendingReview ?? 0),
    reportsNew: Number(data?.highlights?.reportsNew ?? 0),
    supportOpen: Number(data?.highlights?.supportOpen ?? 0),
    adsPublishedToday: Number(data?.highlights?.adsPublishedToday ?? 0),
    featuredAdsCount: Number(data?.highlights?.featuredAdsCount ?? 0),
  };
  const latestReports = Array.isArray(data?.latestReports) ? data.latestReports : [];
  const latestSupportTickets = Array.isArray(data?.latestSupportTickets)
    ? data.latestSupportTickets
    : [];
  const topAds = Array.isArray(data?.topAds) ? data.topAds : [];
  const topCities = Array.isArray(data?.topCities) ? data.topCities : [];
  const adsStatus = Array.isArray(data?.adsStatus) ? data.adsStatus : [];

  const now = Date.now();
  const isUnread = (status: string, createdAt: string | null) => {
    if (status !== "pending" || !createdAt) return false;
    return now - new Date(createdAt).getTime() <= 1000 * 60 * 60 * 24;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <header
        className={cn(
          "rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12",
        )}
      >
        <div
          dir="ltr"
          className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4"
        >
          <div className="flex min-w-0 justify-start">
            <div className={ADMIN_HEADER_LIVE_METRIC_TILE}>
              <span className="text-[10px] font-medium leading-tight text-muted-foreground">مباشر</span>
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden>
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400/45" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_1px_rgba(16,185,129,0.65)]" />
              </span>
            </div>
          </div>

          <div className="flex justify-center" aria-live="polite">
            <div className={ADMIN_HEADER_LIVE_METRIC_TILE}>
              <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                النشطون الآن
              </span>
              <div className="flex flex-row items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden>
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400/45" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_1px_rgba(16,185,129,0.65)]" />
                </span>
                <span className="text-xl font-bold tabular-nums leading-none text-primary sm:text-2xl">
                  {liveCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 justify-end">
            <div dir="rtl" className={ADMIN_DASHBOARD_TITLE_CHIP}>
              <h1 className={cn(AUTH_HEADER_TITLE, "text-lg font-bold leading-tight sm:text-xl")}>
                لوحة التحكم
              </h1>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                نظرة شاملة لحالة المنصة لحظياً
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي المستخدمين"
          value={totals.users}
          icon={<Users className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          label="إجمالي الإعلانات"
          value={totals.ads}
          icon={<Megaphone className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/ads")}
        />
        <StatCard
          label="إجمالي البلاغات"
          value={totals.reports}
          icon={<Flag className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/reports")}
        />
        <StatCard
          label="إجمالي المشاهدات"
          value={totals.views}
          icon={<Eye className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/ads?sort=views")}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="إعلانات قيد المراجعة"
          value={highlights.adsPendingReview}
          icon={<Megaphone className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/ads?status=pending")}
        />
        <StatCard
          label="بلاغات جديدة"
          value={highlights.reportsNew}
          icon={<Flag className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/reports?status=pending")}
        />
        <StatCard
          label="طلبات دعم مفتوحة"
          value={highlights.supportOpen}
          icon={<Headphones className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/support")}
        />
        <StatCard
          label="إعلانات منشورة اليوم"
          value={highlights.adsPublishedToday}
          icon={<Eye className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/ads?status=approved")}
        />
        <StatCard
          label="الإعلانات المميزة"
          value={highlights.featuredAdsCount}
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          onClick={() => navigate("/admin/ads?featured=true")}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cn(CARD_SHELL, "p-4 xl:col-span-2")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">أحدث البلاغات</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/reports")}
              className={cn(
                BTN_FIX,
                "cursor-pointer text-sm font-medium text-primary transition-colors hover:text-primary/90 hover:underline active:opacity-80",
              )}
            >
              عرض الكل
            </button>
          </div>
          <div className={SURFACE_TABLE_WRAP}>
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-primary/20 bg-zinc-900/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-right font-medium">المبلّغ</th>
                  <th className="px-3 py-2.5 text-right font-medium">حول</th>
                  <th className="px-3 py-2.5 text-right font-medium">السبب</th>
                  <th className="px-3 py-2.5 text-right font-medium">الحالة</th>
                  <th className="px-3 py-2.5 text-center font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {latestReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      لا توجد بلاغات حديثة حالياً
                    </td>
                  </tr>
                ) : (
                  latestReports.map((report) => (
                    <tr
                      key={report.id}
                      className={cn(
                        "cursor-pointer last:border-0",
                        ADMIN_TABLE_ROW,
                        isUnread(report.status, report.createdAt)
                          ? "bg-primary/10 hover:bg-primary/[0.14]"
                          : "",
                      )}
                      onClick={() => navigate(`/admin/reports?reportId=${report.id}`)}
                    >
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 border border-primary/25 ring-1 ring-primary/10">
                            <AvatarImage
                              src={mediaSrc(report.reporterAvatarUrl)}
                              alt=""
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
                              {initials(report.reporterName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium text-foreground">
                              {report.reporterName?.trim() || "—"}
                            </p>
                            <p className="text-[11px] tabular-nums text-muted-foreground">#{report.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-3 py-3 align-middle">
                        <ReportSubjectPreview report={report} />
                      </td>
                      <td className="max-w-[200px] px-3 py-3 align-middle">
                        <p className="line-clamp-2 text-foreground">{report.reason}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            reportStatusBadgeClass(report.status),
                          )}
                        >
                          {reportStatusLabel(report.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        <button
                          type="button"
                          className={cn(
                            ADMIN_ROW_ACTION_BASE,
                            "rounded-full border-primary/40 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/20",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/reports?reportId=${report.id}`);
                          }}
                        >
                          عرض
                          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cn(CARD_SHELL, "p-4")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">الإعلانات حسب الحالة</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/ads")}
              className={cn(
                BTN_FIX,
                "cursor-pointer text-sm font-medium text-primary transition-colors hover:text-primary/90 hover:underline active:opacity-80",
              )}
            >
              إدارة الإعلانات
            </button>
          </div>
          <div className="h-56 w-full min-h-[14rem]">
            {adsStatus.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-primary/25 bg-zinc-900/40 px-4 text-center text-sm text-muted-foreground">
                لا توجد بيانات للرسم البياني بعد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={adsStatus}
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="status"
                  >
                    {adsStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(var(--primary))"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgb(9 9 11 / 0.95)",
                      border: "1px solid hsl(var(--primary) / 0.35)",
                      borderRadius: "12px",
                      boxShadow: "0 0 20px -8px hsl(var(--primary) / 0.35)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cn(CARD_SHELL, "p-4")}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">أحدث طلبات الدعم</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/support")}
              className={cn(
                BTN_FIX,
                "cursor-pointer text-sm font-medium text-primary transition-colors hover:underline active:opacity-80",
              )}
            >
              فتح الدعم
            </button>
          </div>
          <div className="space-y-3">
            {latestSupportTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-primary/25 bg-zinc-900/40 p-4 text-center text-sm text-muted-foreground">
                لا توجد طلبات دعم حالياً
              </div>
            ) : (
              latestSupportTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => navigate("/admin/support")}
                  className={cn(
                    BTN_FIX,
                    SUB_CARD,
                    "w-full cursor-pointer p-3 text-right ring-1 ring-primary/5",
                  )}
                >
                  <p className="line-clamp-2 font-medium text-foreground">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    #{ticket.id} • {ticket.userName || "مستخدم"} • {ticket.status}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={cn(CARD_SHELL, "p-4")}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">أكثر الإعلانات مشاهدة</h2>
          <div className="space-y-3">
            {topAds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-primary/25 bg-zinc-900/40 p-4 text-center text-sm text-muted-foreground">
                لا توجد بيانات إعلانات بعد
              </div>
            ) : (
              topAds.map((ad) => (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => navigate(`/admin/ads?focusId=${ad.id}&sort=views`)}
                  className={cn(
                    BTN_FIX,
                    SUB_CARD,
                    "flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-right ring-1 ring-primary/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-foreground">{ad.title}</p>
                    <p className="text-xs text-muted-foreground">
                      #{ad.id} • {ad.city}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {ad.views.toLocaleString("ar-EG")} مشاهدة
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={cn(CARD_SHELL, "p-4")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">أعلى المدن حسب عدد الإعلانات</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/cities")}
              className={cn(
                BTN_FIX,
                "cursor-pointer text-sm font-medium text-primary transition-colors hover:text-primary/90 hover:underline active:opacity-80",
              )}
            >
              إدارة المدن
            </button>
          </div>
          <div className="space-y-3">
            {topCities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-primary/25 bg-zinc-900/40 p-4 text-center text-sm text-muted-foreground">
                لا توجد بيانات مدن حالياً
              </div>
            ) : (
              topCities.map((city) => (
                <div key={city.city} className="rounded-xl border border-primary/20 bg-zinc-900/50 p-3 ring-1 ring-primary/5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{city.city}</p>
                    <p className="tabular-nums text-sm text-primary">{city.adsCount}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-primary/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-primary/90 to-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.45)]"
                      style={{
                        width: `${Math.max(8, Math.min(100, (city.adsCount / (topCities[0]?.adsCount || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => navigate("/admin/stats")}
          className={cn(AUTH_ACCENT_OUTLINE_BTN, BTN_FIX, "max-w-md cursor-pointer hover:bg-zinc-900 active:scale-[0.98]")}
        >
          عرض الإحصائيات التفصيلية
        </button>
      </div>
    </div>
  );
}
