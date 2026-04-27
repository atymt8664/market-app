import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  LayoutGrid,
  Megaphone,
  Flag,
  LifeBuoy,
  Users,
  BarChart3,
  Building2,
  FolderTree,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", href: "/admin", label: "الرئيسية", icon: LayoutGrid },
  { key: "ads", href: "/admin/ads", label: "الإعلانات", icon: Megaphone },
  { key: "reports", href: "/admin/reports", label: "البلاغات", icon: Flag },
  { key: "support", href: "/admin/support", label: "الدعم والمساعدة", icon: LifeBuoy },
  { key: "users", href: "/admin/users", label: "المستخدمون", icon: Users },
  { key: "stats", href: "/admin/stats", label: "الإحصائيات", icon: BarChart3 },
  { key: "cities", href: "/admin/cities", label: "المدن", icon: Building2 },
  { key: "categories", href: "/admin/categories", label: "الأقسام", icon: FolderTree },
  { key: "logs", href: "/admin/logs", label: "سجل النشاطات", icon: ScrollText },
  { key: "settings", href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

type AdminShellProps = {
  activeKey: string;
  onLogout: () => Promise<void>;
  children: ReactNode;
};

export function AdminShell({ activeKey, onLogout, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-72 border-r border-slate-800/80 bg-[#0d1324] p-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">سوق العرب</p>
              <p className="text-xs text-slate-400">لوحة التحكم</p>
            </div>
          </div>
          <nav className="space-y-2">
            {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  key === activeKey
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </aside>
        <main className="w-full p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
