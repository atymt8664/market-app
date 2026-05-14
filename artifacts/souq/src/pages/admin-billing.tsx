import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FileText, Loader2, Wallet2 } from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import {
  BTN_FIX,
  CARD_SHELL,
  INPUT_FIELD,
  PANEL_INSET,
  STAT_TILE,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const YEARS = [2024, 2025, 2026, 2027] as const;

function StatPlaceholderCard({ titleKey }: { titleKey: string }) {
  return (
    <div className={cn(STAT_TILE, "flex flex-col gap-1.5 text-right")}>
      <p className="text-xs font-medium leading-snug text-zinc-400">{t(titleKey)}</p>
      <p className="text-xl font-bold tabular-nums tracking-tight text-primary">{t("admin_billing.placeholder_amount")}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-primary/35 bg-zinc-950/90 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {t("admin_billing.placeholder_badge")}
        </span>
        <span className="text-[11px] text-zinc-500">{t("admin_billing.placeholder_no_data")}</span>
      </div>
    </div>
  );
}

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
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A] text-primary" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const statKeys = [
    "admin_billing.stats.month_total",
    "admin_billing.stats.promo",
    "admin_billing.stats.premium_account",
    "admin_billing.stats.professional_account",
    "admin_billing.stats.successful",
    "admin_billing.stats.refunded",
    "admin_billing.stats.taxes_fees",
  ] as const;

  const channelKeys = [
    "admin_billing.channels.promo",
    "admin_billing.channels.premium",
    "admin_billing.channels.professional",
    "admin_billing.channels.stores",
    "admin_billing.channels.badges",
  ] as const;

  const tableCols = [
    "admin_billing.table.col_date",
    "admin_billing.table.col_type",
    "admin_billing.table.col_ad_user",
    "admin_billing.table.col_bundle",
    "admin_billing.table.col_amount",
    "admin_billing.table.col_fees",
    "admin_billing.table.col_tax",
    "admin_billing.table.col_net",
    "admin_billing.table.col_status",
  ] as const;

  return (
    <AdminShell activeKey="billing" onLogout={onLogout}>
      <div className="space-y-5" dir="rtl">
        <header className="space-y-2 text-right">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)] ring-1 ring-primary/15">
              <Wallet2 className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("admin_billing.title")}</h1>
              <p className="text-sm leading-relaxed text-zinc-400">{t("admin_billing.subtitle")}</p>
            </div>
          </div>
        </header>

        <div
          className="rounded-2xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-right text-[13px] font-medium leading-relaxed text-amber-100/95"
          role="status"
        >
          {t("admin_billing.alert")}
        </div>

        <section className={CARD_SHELL}>
          <h2 className="mb-3 text-right text-base font-semibold text-foreground">{t("admin_billing.filter.title")}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-right text-xs font-medium text-zinc-400">
              {t("admin_billing.filter.month")}
              <select
                className={cn(BTN_FIX, INPUT_FIELD, "h-11 cursor-pointer")}
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                aria-label={t("admin_billing.filter.month")}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[120px] flex-1 flex-col gap-1.5 text-right text-xs font-medium text-zinc-400">
              {t("admin_billing.filter.year")}
              <select
                className={cn(BTN_FIX, INPUT_FIELD, "h-11 cursor-pointer")}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                aria-label={t("admin_billing.filter.year")}
              >
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-right text-[11px] text-zinc-500">{t("admin_billing.filter.hint")}</p>
        </section>

        <section>
          <h2 className="mb-3 text-right text-base font-semibold text-foreground">{t("admin_billing.stats.section_title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {statKeys.map((k) => (
              <StatPlaceholderCard key={k} titleKey={k} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-right text-base font-semibold text-foreground">{t("admin_billing.channels.section_title")}</h2>
          <p className="mb-3 text-right text-xs leading-relaxed text-zinc-500">{t("admin_billing.channels.subtitle")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {channelKeys.map((k) => (
              <StatPlaceholderCard key={k} titleKey={k} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-right text-base font-semibold text-foreground">{t("admin_billing.revenue_sources.title")}</h2>
          <div className={SURFACE_TABLE_WRAP}>
            <table className="w-full min-w-[720px] border-collapse text-right text-sm">
              <thead>
                <tr className="border-b border-primary/25 bg-zinc-950/90">
                  {tableCols.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-zinc-300">
                      {t(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={tableCols.length} className={PANEL_INSET}>
                    <p className="text-sm font-medium text-zinc-400">{t("admin_billing.revenue_sources.empty")}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-right text-base font-semibold text-foreground">{t("admin_billing.invoices.title")}</h2>
          <div className={SUB_CARD}>
            <div className="flex flex-col gap-2 text-right sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary/90" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("admin_billing.invoices.sample_title")}</p>
                  <p className="text-xs text-zinc-500">{t("admin_billing.invoices.empty")}</p>
                </div>
              </div>
              <Button
                type="button"
                disabled
                className="h-10 shrink-0 rounded-xl border border-primary/30 bg-zinc-950/80 text-xs font-semibold text-zinc-500 shadow-none"
              >
                {t("admin_billing.invoices.pdf_btn")}
              </Button>
            </div>
            <p className="mt-3 text-right text-[11px] leading-relaxed text-zinc-500">{t("admin_billing.invoices.pdf_hint")}</p>
          </div>
        </section>

        <section className={CARD_SHELL}>
          <h2 className="mb-2 text-right text-base font-semibold text-foreground">{t("admin_billing.tax.title")}</h2>
          <p className="mb-3 text-right text-sm leading-relaxed text-zinc-400">{t("admin_billing.tax.intro")}</p>
          <ul className="list-disc space-y-1.5 pr-5 text-right text-sm text-zinc-400">
            <li>{t("admin_billing.tax.b1")}</li>
            <li>{t("admin_billing.tax.b2")}</li>
            <li>{t("admin_billing.tax.b3")}</li>
            <li>{t("admin_billing.tax.b4")}</li>
            <li>{t("admin_billing.tax.b5")}</li>
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
