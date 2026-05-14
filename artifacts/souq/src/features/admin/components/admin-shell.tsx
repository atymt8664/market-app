import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  LayoutGrid,
  Megaphone,
  Flag,
  LifeBuoy,
  Users,
  BadgeCheck,
  Layers,
  BarChart3,
  Building2,
  FolderTree,
  ScrollText,
  Wallet2,
  Settings,
  LogOut,
} from "lucide-react";
import { useAdminDashboard } from "@/features/admin/hooks";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", href: "/admin", label: "الرئيسية", icon: LayoutGrid },
  { key: "ads", href: "/admin/ads", label: "الإعلانات", icon: Megaphone },
  { key: "reports", href: "/admin/reports", label: "البلاغات", icon: Flag },
  { key: "support", href: "/admin/support", label: "الدعم والمساعدة", icon: LifeBuoy },
  { key: "users", href: "/admin/users", label: "المستخدمون", icon: Users },
  { key: "verification", href: "/admin/verification", label: "التوثيق", icon: BadgeCheck },
  { key: "plans", href: "/admin/plans", label: "الخطط والحسابات", icon: Layers },
  { key: "stats", href: "/admin/stats", label: "الإحصائيات", icon: BarChart3 },
  { key: "cities", href: "/admin/cities", label: "المدن", icon: Building2 },
  { key: "categories", href: "/admin/categories", label: "الأقسام", icon: FolderTree },
  { key: "logs", href: "/admin/logs", label: "سجل النشاطات", icon: ScrollText },
  { key: "billing", href: "/admin/billing", label: "المالية والفواتير", icon: Wallet2 },
  { key: "settings", href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

type AdminShellProps = {
  activeKey: string;
  onLogout: () => Promise<void>;
  children: ReactNode;
};

export function AdminShell({ activeKey, onLogout, children }: AdminShellProps) {
  const dashboardQuery = useAdminDashboard();
  const fallbackBadges = {
    adsPendingReview: Number(dashboardQuery.data?.highlights?.adsPendingReview ?? 0),
    reportsOpen: Number(dashboardQuery.data?.highlights?.reportsNew ?? 0),
    supportOpen: Number(dashboardQuery.data?.highlights?.supportOpen ?? 0),
    usersNewToday: 0,
  };
  const badges = {
    adsPendingReview: Number(
      dashboardQuery.data?.badges?.adsPendingReview ?? fallbackBadges.adsPendingReview,
    ),
    reportsOpen: Number(
      dashboardQuery.data?.badges?.reportsOpen ?? fallbackBadges.reportsOpen,
    ),
    supportOpen: Number(
      dashboardQuery.data?.badges?.supportOpen ?? fallbackBadges.supportOpen,
    ),
    usersNewToday: Number(
      dashboardQuery.data?.badges?.usersNewToday ?? fallbackBadges.usersNewToday,
    ),
  };
  const getBadge = (key: string): number => {
    if (key === "ads") return badges.adsPendingReview;
    if (key === "reports") return badges.reportsOpen;
    if (key === "support") return badges.supportOpen;
    if (key === "users") return badges.usersNewToday;
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground" dir="rtl">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside
          className={cn(
            "shrink-0 border-b border-primary/30 bg-zinc-950/95 shadow-[0_0_28px_-14px_hsl(var(--primary)/0.22)] backdrop-blur-sm",
            "lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r lg:border-primary/35",
          )}
        >
          <div className="flex flex-col gap-4 p-4 lg:flex-1 lg:gap-5 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.45)] ring-1 ring-primary/15">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 text-right">
                <p className="truncate text-lg font-semibold text-foreground">سوق العرب EU</p>
                <p className="text-xs text-muted-foreground">لوحة التحكم</p>
              </div>
            </div>

            <nav className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:flex-1 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition lg:w-full",
                    key === activeKey
                      ? "border border-primary/50 bg-primary/15 font-semibold text-primary shadow-[0_0_20px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/25"
                      : "border border-transparent text-muted-foreground hover:border-primary/30 hover:bg-zinc-900/85 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="inline-flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{label}</span>
                    {getBadge(key) > 0 ? (
                      <span className="inline-flex min-w-[1.35rem] shrink-0 items-center justify-center rounded-full border border-red-500/45 bg-red-600/90 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-[0_0_12px_-4px_rgba(220,38,38,0.55)]">
                        {getBadge(key) > 99 ? "99+" : getBadge(key)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => void onLogout()}
              className="mt-1 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-500/45 bg-red-950/35 px-3 py-2.5 text-sm font-medium text-red-200 shadow-[0_0_18px_-10px_rgba(220,38,38,0.35)] transition hover:border-red-400/55 hover:bg-red-950/55 lg:mt-auto"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
