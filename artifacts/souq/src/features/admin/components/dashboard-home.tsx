import { Eye, Flag, Megaphone, Users } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import type { AdminDashboardResponse } from "../types";

type DashboardHomeProps = {
  data: AdminDashboardResponse;
  isRefreshing?: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  approved: "#22c55e",
  pending: "#f59e0b",
  rejected: "#ef4444",
  hidden: "#64748b",
};

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
      className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4 text-right transition hover:border-indigo-400/40 hover:bg-[#111a31]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="rounded-lg bg-slate-800/70 p-2 text-slate-300">{icon}</span>
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
    </button>
  );
}

export function DashboardHome({ data, isRefreshing = false }: DashboardHomeProps) {
  const [, navigate] = useLocation();
  const totals = data?.totals ?? { users: 0, ads: 0, reports: 0, views: 0 };
  const highlights = {
    adsPendingReview: Number(data?.highlights?.adsPendingReview ?? 0),
    reportsNew: Number(data?.highlights?.reportsNew ?? 0),
    supportOpen: Number(data?.highlights?.supportOpen ?? 0),
    adsPublishedToday: Number(data?.highlights?.adsPublishedToday ?? 0),
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
    <div className="space-y-6">
      <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
        <div>
          <h1 className="text-2xl font-semibold">لوحة التحكم</h1>
          <p className="text-sm text-slate-400">نظرة شاملة لحالة المنصة لحظيا</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            isRefreshing ? "bg-indigo-500/20 text-indigo-200" : "bg-slate-800 text-slate-300"
          }`}
        >
          {isRefreshing ? "جاري التحديث..." : "مباشر"}
        </span>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي المستخدمين"
          value={totals.users}
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          label="إجمالي الإعلانات"
          value={totals.ads}
          icon={<Megaphone className="h-4 w-4" />}
          onClick={() => navigate("/admin/ads")}
        />
        <StatCard
          label="إجمالي البلاغات"
          value={totals.reports}
          icon={<Flag className="h-4 w-4" />}
          onClick={() => navigate("/admin/reports?status=pending")}
        />
        <StatCard
          label="إجمالي المشاهدات"
          value={totals.views}
          icon={<Eye className="h-4 w-4" />}
          onClick={() => navigate("/admin/ads?sort=views")}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إعلانات قيد المراجعة"
          value={highlights.adsPendingReview}
          icon={<Megaphone className="h-4 w-4" />}
          onClick={() => navigate("/admin/ads?status=pending")}
        />
        <StatCard
          label="بلاغات جديدة"
          value={highlights.reportsNew}
          icon={<Flag className="h-4 w-4" />}
          onClick={() => navigate("/admin/reports?status=pending")}
        />
        <StatCard
          label="طلبات دعم مفتوحة"
          value={highlights.supportOpen}
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate("/admin/support?status=open")}
        />
        <StatCard
          label="إعلانات منشورة اليوم"
          value={highlights.adsPublishedToday}
          icon={<Eye className="h-4 w-4" />}
          onClick={() => navigate("/admin/ads?status=approved")}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">أحدث البلاغات</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/reports")}
              className="text-sm text-indigo-300 transition hover:text-indigo-200"
            >
              عرض الكل
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-2 py-2 text-right">#</th>
                  <th className="px-2 py-2 text-right">السبب</th>
                  <th className="px-2 py-2 text-right">الحالة</th>
                  <th className="px-2 py-2 text-right">المبلغ</th>
                  <th className="px-2 py-2 text-right">الإعلان</th>
                </tr>
              </thead>
              <tbody>
                {latestReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                      لا توجد بلاغات حديثة حالياً
                    </td>
                  </tr>
                ) : (
                  latestReports.map((report) => (
                  <tr
                    key={report.id}
                    className={`cursor-pointer border-b border-slate-900/80 transition hover:bg-slate-900/60 ${
                      isUnread(report.status, report.createdAt) ? "bg-indigo-500/10" : ""
                    }`}
                    onClick={() => navigate(`/admin/reports?reportId=${report.id}`)}
                  >
                    <td className="px-2 py-3">{report.id}</td>
                    <td className="px-2 py-3">{report.reason}</td>
                    <td className="px-2 py-3">{report.status}</td>
                    <td className="px-2 py-3">{report.reporterName || "—"}</td>
                    <td className="px-2 py-3">{report.targetAdId || "—"}</td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold">الإعلانات حسب الحالة</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={adsStatus} innerRadius={55} outerRadius={80} dataKey="value" nameKey="status">
                  {adsStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#3b82f6"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold">أحدث طلبات الدعم</h2>
          <div className="space-y-3">
            {latestSupportTickets.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-4 text-sm text-slate-400">
                لا توجد طلبات دعم حالياً
              </div>
            ) : (
              latestSupportTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                <p className="line-clamp-1 font-medium">{ticket.subject}</p>
                <p className="text-xs text-slate-400">
                  #{ticket.id} • {ticket.userName || "مستخدم"} • {ticket.status}
                </p>
              </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold">أكثر الإعلانات مشاهدة</h2>
          <div className="space-y-3">
            {topAds.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-4 text-sm text-slate-400">
                لا توجد بيانات إعلانات بعد
              </div>
            ) : (
              topAds.map((ad) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => navigate(`/admin/ads?focusId=${ad.id}&sort=views`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#0a1020] p-3 text-right transition hover:border-indigo-400/40 hover:bg-slate-900/60"
              >
                <div>
                  <p className="line-clamp-1 font-medium">{ad.title}</p>
                  <p className="text-xs text-slate-400">
                    #{ad.id} • {ad.city}
                  </p>
                </div>
                <span className="text-sm font-semibold text-indigo-300">{ad.views.toLocaleString()} مشاهدة</span>
              </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold">أعلى المدن حسب عدد الإعلانات</h2>
          <div className="space-y-3">
            {topCities.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-4 text-sm text-slate-400">
                لا توجد بيانات مدن حالياً
              </div>
            ) : (
              topCities.map((city) => (
              <div key={city.city} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{city.city}</p>
                  <p className="text-sm text-slate-300">{city.adsCount}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-400"
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
    </div>
  );
}
