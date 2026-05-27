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
  Crown,
  UserCog,
  Activity,
  Workflow,
} from "lucide-react";
import { useAdminAccess } from "@/features/admin/access";
import { useAdminNavBadges } from "@/features/admin/use-admin-nav-badges";
import type { AdminNavKey } from "@/features/admin/rbac";
import { canAccessNav } from "@/features/admin/rbac";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  key: AdminNavKey;
  href: string;
  labelKey: string;
  icon: typeof LayoutGrid;
}> = [
  { key: "dashboard", href: "/admin", labelKey: "p8.admin.nav.dashboard", icon: LayoutGrid },
  { key: "ads", href: "/admin/ads", labelKey: "p8.admin.nav.ads", icon: Megaphone },
  { key: "reports", href: "/admin/reports", labelKey: "p8.admin.nav.reports", icon: Flag },
  { key: "support", href: "/admin/support", labelKey: "p8.admin.nav.support", icon: LifeBuoy },
  { key: "users", href: "/admin/users", labelKey: "p8.admin.nav.users", icon: Users },
  { key: "verification", href: "/admin/verification", labelKey: "p8.admin.nav.verification", icon: BadgeCheck },
  { key: "plans", href: "/admin/plans", labelKey: "p8.admin.nav.plans", icon: Layers },
  { key: "analytics", href: "/admin/analytics", labelKey: "p8.admin.nav.analytics", icon: BarChart3 },
  { key: "staff", href: "/admin/staff", labelKey: "p8.admin.nav.staff", icon: UserCog },
  { key: "operations", href: "/admin/operations", labelKey: "p8.admin.nav.operations", icon: Workflow },
  { key: "monitoring", href: "/admin/monitoring", labelKey: "p8.admin.nav.monitoring", icon: Activity },
  { key: "cities", href: "/admin/cities", labelKey: "p8.admin.nav.cities", icon: Building2 },
  { key: "categories", href: "/admin/categories", labelKey: "p8.admin.nav.categories", icon: FolderTree },
  { key: "logs", href: "/admin/logs", labelKey: "p8.admin.nav.logs", icon: ScrollText },
  { key: "billing", href: "/admin/billing", labelKey: "p8.admin.nav.billing", icon: Wallet2 },
  { key: "settings", href: "/admin/settings", labelKey: "p8.admin.nav.settings", icon: Settings },
];

type AdminShellProps = {
  activeKey: string;
  onLogout: () => Promise<void>;
  children: ReactNode;
};

export function AdminShell({ activeKey, onLogout, children }: AdminShellProps) {
  const access = useAdminAccess();
  const badgesQuery = useAdminNavBadges(!access.isLoading);
  const badges = badgesQuery.data;

  const visibleNav = NAV_ITEMS.filter((item) => {
    if ((item.key === "operations" || item.key === "monitoring") && !access.isFounder) {
      return false;
    }
    return access.isFounder || canAccessNav(access.permissions, item.key);
  });

  const getBadge = (key: string): number => {
    if (!badges) return 0;
    if (key === "ads") return badges.adsPendingReview;
    if (key === "reports") return badges.reportsOpen;
    if (key === "support") return badges.supportOpen;
    if (key === "users") return badges.usersNewToday;
    if (key === "verification") return badges.verificationOpen;
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
                {access.isFounder ? (
                  <Crown className="h-5 w-5 text-amber-300" aria-hidden />
                ) : (
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 text-right">
                <p className="truncate text-lg font-semibold text-foreground">
                  {access.isFounder ? t("p8.admin.shell.founder_brand") : t("p8.admin.shell.brand")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {access.displayName} · {t(`p8.admin.roles.${access.roleKey}.title`)}
                </p>
              </div>
            </div>

            <nav className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:flex-1 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {visibleNav.map(({ key, href, labelKey, icon: Icon }) => (
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
                    <span className="truncate">{t(labelKey)}</span>
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
              {t("p8.admin.shell.logout")}
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
