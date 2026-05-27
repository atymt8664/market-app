import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { adminLogout } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { DashboardHome } from "@/features/admin/components/dashboard-home";
import { useAdminDashboard, useRequireAdmin } from "@/features/admin/hooks";
import { BTN_FIX } from "@/features/admin/admin-interaction-classes";
import { t } from "@/i18n";
import { AUTH_ACCENT_OUTLINE_BTN } from "@/lib/auth-page-styles";
import { cn } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="h-20 animate-pulse rounded-2xl border border-primary/25 bg-zinc-950/70 ring-1 ring-primary/10" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-primary/25 bg-zinc-950/70 ring-1 ring-primary/10"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border border-primary/25 bg-zinc-950/70 ring-1 ring-primary/10 xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border border-primary/25 bg-zinc-950/70 ring-1 ring-primary/10" />
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
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4 text-foreground"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/40 bg-zinc-950/85 px-8 py-10 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
          <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("p8.admin.page.loading")}</p>
        </div>
      </div>
    );
  }

  if (!dashboardQuery.data) {
    if (dashboardQuery.isError) {
      return (
        <AdminShell activeKey="dashboard" onLogout={handleLogout}>
          <div
            className="rounded-2xl border border-destructive/35 bg-destructive/10 p-8 text-center text-destructive shadow-[0_0_20px_-12px_rgba(0,0,0,0.4)] ring-1 ring-destructive/25"
            dir="rtl"
          >
            <p className="mb-4 text-destructive">{t("p8.admin.page.load_error")}</p>
            <button
              type="button"
              onClick={() => dashboardQuery.refetch()}
              className={cn(AUTH_ACCENT_OUTLINE_BTN, BTN_FIX, "cursor-pointer hover:bg-zinc-900 active:scale-[0.98]")}
            >
              {t("p8.admin.page.retry")}
            </button>
          </div>
        </AdminShell>
      );
    }

    return (
      <AdminShell activeKey="dashboard" onLogout={handleLogout}>
        <DashboardSkeleton />
      </AdminShell>
    );
  }

  return (
    <AdminShell activeKey="dashboard" onLogout={handleLogout}>
      <DashboardHome data={dashboardQuery.data} isRefreshing={dashboardQuery.isFetching} />
    </AdminShell>
  );
}
