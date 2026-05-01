import { useState } from "react";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminLogout } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminStats, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminStatsPeriod } from "@/features/admin/types";

const TEXT = {
  loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
  title: "\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a",
  subtitle:
    "\u0642\u0631\u0627\u0621\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u062f\u0648\u0646 \u0623\u064a \u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0647\u0645\u064a\u0629",
  loadingStats: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a...",
  errorStats: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a.",
  retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
  noData: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a",
  usersTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646",
  adsTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a",
  reportsTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a",
  supportTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062f\u0639\u0645",
  viewsTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0634\u0627\u0647\u062f\u0627\u062a",
  citiesTotal: "\u0627\u0644\u0645\u062f\u0646 \u0627\u0644\u0645\u0633\u062c\u0644\u0629",
  categoriesTotal: "\u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0645\u0633\u062c\u0644\u0629",
  adsToday: "\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0645\u0646\u0634\u0648\u0631\u0629 \u0627\u0644\u064a\u0648\u0645",
  usersGrowth: "\u0646\u0645\u0648 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646",
  reportsSummary: "\u0645\u0644\u062e\u0635 \u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a",
  supportSummary: "\u0645\u0644\u062e\u0635 \u0627\u0644\u062f\u0639\u0645",
  adsByStatus: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u062d\u0627\u0644\u0629",
  periodMetrics: "\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629",
  topCities: "\u0623\u0643\u062b\u0631 \u0627\u0644\u0645\u062f\u0646 \u0646\u0634\u0627\u0637\u064b\u0627",
  topCategories: "\u0623\u0643\u062b\u0631 \u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u064b\u0627",
  topAds: "\u0623\u0643\u062b\u0631 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0645\u0634\u0627\u0647\u062f\u0629",
  pendingReview: "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  approved: "\u0645\u0642\u0628\u0648\u0644\u0629",
  rejected: "\u0645\u0631\u0641\u0648\u0636\u0629",
  hidden: "\u0645\u062e\u0641\u064a\u0629",
  newToday: "\u062c\u062f\u062f \u0627\u0644\u064a\u0648\u0645",
  newWeek: "\u062c\u062f\u062f \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
  newMonth: "\u062c\u062f\u062f \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631",
  reportsNew: "\u0628\u0644\u0627\u063a\u0627\u062a \u062c\u062f\u064a\u062f\u0629 (\u062d\u0633\u0628 \u0627\u0644\u0641\u062a\u0631\u0629)",
  open: "\u0645\u0641\u062a\u0648\u062d\u0629",
  resolved: "\u0645\u062d\u0644\u0648\u0644\u0629",
  inReview: "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  processing: "\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629",
  closed: "\u0645\u063a\u0644\u0642\u0629",
  users: "\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646",
  ads: "\u0625\u0639\u0644\u0627\u0646\u0627\u062a",
  reports: "\u0628\u0644\u0627\u063a\u0627\u062a",
  support: "\u062f\u0639\u0645",
  adUnit: "\u0625\u0639\u0644\u0627\u0646",
  viewsUnit: "\u0645\u0634\u0627\u0647\u062f\u0629",
  today: "\u0627\u0644\u064a\u0648\u0645",
  sevenDays: "\u0622\u062e\u0631 7 \u0623\u064a\u0627\u0645",
  thirtyDays: "\u0622\u062e\u0631 30 \u064a\u0648\u0645",
  all: "\u0627\u0644\u0643\u0644",
};

const PERIOD_OPTIONS: Array<{ value: AdminStatsPeriod; label: string }> = [
  { value: "today", label: TEXT.today },
  { value: "7d", label: TEXT.sevenDays },
  { value: "30d", label: TEXT.thirtyDays },
  { value: "all", label: TEXT.all },
];

const ADS_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  hidden: "#64748b",
};

function NumberCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-[0_10px_24px_-18px_rgba(99,102,241,0.9)]">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("ar-EG")}</p>
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
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
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

  return (
    <AdminShell activeKey="stats" onLogout={handleLogout}>
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{TEXT.title}</h1>
              <p className="text-sm text-slate-400">{TEXT.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                    period === item.value
                      ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/50 shadow-[0_8px_20px_-16px_rgba(99,102,241,0.9)]"
                      : "bg-[#0a1020] text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600/80 active:scale-[0.98]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {statsQuery.isLoading && !data ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-8 text-center text-slate-300">
            {TEXT.loadingStats}
          </div>
        ) : statsQuery.isError || !data ? (
          <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
            <p className="mb-3">{TEXT.errorStats}</p>
            <button
              type="button"
              onClick={() => statsQuery.refetch()}
              className="cursor-pointer rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98]"
            >
              {TEXT.retry}
            </button>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NumberCard label={TEXT.usersTotal} value={data.totals.users} />
              <NumberCard label={TEXT.adsTotal} value={data.totals.ads} />
              <NumberCard label={TEXT.reportsTotal} value={data.totals.reports} />
              <NumberCard label={TEXT.supportTotal} value={data.totals.supportTickets} />
              <NumberCard label={TEXT.viewsTotal} value={data.totals.views} />
              <NumberCard label={TEXT.citiesTotal} value={data.totals.cities} />
              <NumberCard label={TEXT.categoriesTotal} value={data.totals.categories} />
              <NumberCard label={TEXT.adsToday} value={data.ads.publishedToday} />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.usersGrowth}</h2>
                <div className="space-y-2 text-sm">
                  <p>{TEXT.newToday}: <span className="font-semibold">{data.users.newToday.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.newWeek}: <span className="font-semibold">{data.users.newWeek.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.newMonth}: <span className="font-semibold">{data.users.newMonth.toLocaleString("ar-EG")}</span></p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.reportsSummary}</h2>
                <div className="space-y-2 text-sm">
                  <p>{TEXT.reportsNew}: <span className="font-semibold">{data.reports.new.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.inReview}: <span className="font-semibold">{data.reports.inReview.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.open}: <span className="font-semibold">{data.reports.open.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.resolved}: <span className="font-semibold">{data.reports.resolved.toLocaleString("ar-EG")}</span></p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.supportSummary}</h2>
                <div className="space-y-2 text-sm">
                  <p>{TEXT.open}: <span className="font-semibold">{data.support.open.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.processing}: <span className="font-semibold">{data.support.pending.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.resolved}: <span className="font-semibold">{data.support.resolved.toLocaleString("ar-EG")}</span></p>
                  <p>{TEXT.closed}: <span className="font-semibold">{data.support.closed.toLocaleString("ar-EG")}</span></p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.adsByStatus}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={adsStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                        {adsStatusData.map((entry) => (
                          <Cell key={entry.key} fill={ADS_STATUS_COLORS[entry.key] || "#3b82f6"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _name, item) => [
                          `${Number(value).toLocaleString("ar-EG")} ${TEXT.adUnit}`,
                          String(item?.payload?.name ?? ""),
                        ]}
                        contentStyle={{
                          background: "#0a1020",
                          border: "1px solid #334155",
                          borderRadius: "10px",
                          color: "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.periodMetrics}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: TEXT.users, value: data.periodMetrics.users },
                        { name: TEXT.ads, value: data.periodMetrics.ads },
                        { name: TEXT.reports, value: data.periodMetrics.reports },
                        { name: TEXT.support, value: data.periodMetrics.supportTickets },
                      ]}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value: number) => `${Number(value).toLocaleString("ar-EG")}`}
                        contentStyle={{
                          background: "#0a1020",
                          border: "1px solid #334155",
                          borderRadius: "10px",
                          color: "#e2e8f0",
                        }}
                        cursor={{ fill: "rgba(99,102,241,0.15)" }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.topCities}</h2>
                <div className="space-y-2">
                  {data.topCities.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-sm text-slate-400">{TEXT.noData}</div>
                  ) : (
                    data.topCities.map((item) => (
                      <div key={item.city} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-sm">
                        <p className="font-medium">{item.city}</p>
                        <p className="text-slate-400">{item.adsCount.toLocaleString("ar-EG")} {TEXT.adUnit} ? {item.totalViews.toLocaleString("ar-EG")} {TEXT.viewsUnit}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.topCategories}</h2>
                <div className="space-y-2">
                  {data.topCategories.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-sm text-slate-400">{TEXT.noData}</div>
                  ) : (
                    data.topCategories.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-sm">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-slate-400">{item.adsCount.toLocaleString("ar-EG")} {TEXT.adUnit} ? {item.totalViews.toLocaleString("ar-EG")} {TEXT.viewsUnit}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
                <h2 className="mb-3 text-lg font-semibold">{TEXT.topAds}</h2>
                <div className="space-y-2">
                  {data.topAds.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-sm text-slate-400">{TEXT.noData}</div>
                  ) : (
                    data.topAds.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-sm">
                        <p className="line-clamp-1 font-medium">{item.title}</p>
                        <p className="text-slate-400">#{item.id} ? {item.city} ? {item.views.toLocaleString("ar-EG")} {TEXT.viewsUnit}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
