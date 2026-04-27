import { useLocation } from "wouter";
import { adminLogout } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { DashboardHome } from "@/features/admin/components/dashboard-home";
import { useAdminDashboard, useRequireAdmin } from "@/features/admin/hooks";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1324]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1324]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1324] xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-[#0d1324]" />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const dashboardQuery = useAdminDashboard();

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">جاري تحميل لوحة التحكم...</div>;
  }

  if (!dashboardQuery.data) {
    return (
      <AdminShell activeKey="dashboard" onLogout={handleLogout}>
        <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
          <p className="mb-3">تعذر تحميل بيانات لوحة التحكم.</p>
          <button
            type="button"
            onClick={() => dashboardQuery.refetch()}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell activeKey="dashboard" onLogout={handleLogout}>
      {dashboardQuery.isLoading ? (
        <DashboardSkeleton />
      ) : (
        <DashboardHome data={dashboardQuery.data} isRefreshing={dashboardQuery.isFetching} />
      )}
    </AdminShell>
  );
}
