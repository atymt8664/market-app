import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FileText, Wallet2 } from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import {
  BTN_FIX,
  CARD_SHELL,
  INPUT_FIELD,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
} from "@/features/admin/admin-interaction-classes";
import {
  AdminEmptyState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const YEARS = [2024, 2025, 2026, 2027] as const;

const CHANNEL_KEYS = [
  "admin_billing.channels.promo",
  "admin_billing.channels.premium",
  "admin_billing.channels.professional",
  "admin_billing.channels.stores",
  "admin_billing.channels.badges",
] as const;

export default function AdminBillingPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const current = useMemo(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }, []);
  const [filterMonth, setFilterMonth] = useState(String(current.month));
  const [filterYear, setFilterYear] = useState(String(current.year));

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A]" dir="rtl">
        <AdminPageLoading message={t("p8.admin.common.loading")} />
      </div>
    );
  }

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  return (
    <AdminShell activeKey="billing" onLogout={onLogout}>
      <div className="space-y-5" dir="rtl">
        <header className="space-y-2 text-right">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)] ring-1 ring-primary/15">
              <Wallet2 className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground">{t("admin_billing.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("admin_billing.subtitle")}</p>
            </div>
          </div>
        </header>

        <section className={cn(CARD_SHELL, "border-amber-500/35 bg-amber-950/15 p-5 text-right")}>
          <h2 className="text-base font-semibold text-amber-100">{t("p8.admin.billing.disconnected_title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/85">{t("p8.admin.billing.disconnected_body")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("p8.admin.billing.next_step")}</p>
        </section>

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-right text-sm">
              <span className="text-muted-foreground">{t("admin_billing.filter.month")}</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className={cn(INPUT_FIELD, "min-w-[120px]")}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-right text-sm">
              <span className="text-muted-foreground">{t("admin_billing.filter.year")}</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={cn(INPUT_FIELD, "min-w-[120px]")}
              >
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="outline" className={cn(BTN_FIX, "rounded-2xl")} disabled>
              {t("admin_billing.filter.apply")}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNEL_KEYS.map((k) => (
              <div key={k} className={cn(SUB_CARD, "p-4 text-right opacity-80")}>
                <p className="text-xs text-muted-foreground">{t(k)}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{t("p8.admin.common.dash")}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("p8.admin.billing.awaiting_source")}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            {t("admin_billing.table.title")}
          </h2>
          <div className={SURFACE_TABLE_WRAP}>
            <AdminEmptyState title={t("p8.admin.billing.transactions_empty")} />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
