import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { Layers, Loader2 } from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import { CARD_SHELL, SUB_CARD } from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

function PlanBlock({
  titleKey,
  stateKey,
  children,
}: {
  titleKey: string;
  stateKey: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        SUB_CARD,
        "space-y-3 border-primary/35 p-4 text-start shadow-[0_0_22px_-12px_hsl(var(--primary)/0.16)] sm:p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">{t(titleKey)}</h3>
        <span className="shrink-0 rounded-full border border-zinc-600/80 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
          {t(stateKey)}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function AdminPlansPage() {
  const { dir } = useAdminLocale();
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A] text-primary" dir={dir}>
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  return (
    <AdminShell activeKey="plans" onLogout={onLogout}>
      <div className="space-y-5">
        <header className="space-y-2 text-start">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)] ring-1 ring-primary/15">
              <Layers className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("p8.admin.plans.title")}</h1>
              <p className="text-sm leading-relaxed text-zinc-400">{t("p8.admin.plans.subtitle")}</p>
            </div>
          </div>
        </header>

        <div
          className="rounded-2xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-start text-[13px] font-medium leading-relaxed text-amber-100/95"
          role="status"
        >
          {t("p8.admin.plans.alert_no_payment")}
        </div>

        <section className={CARD_SHELL}>
          <h2 className="mb-2 text-start text-base font-semibold text-foreground">{t("p8.admin.plans.trust_title")}</h2>
          <p className="text-start text-sm leading-relaxed text-zinc-400">{t("p8.admin.plans.trust_desc")}</p>
        </section>

        <div className="grid gap-4">
          <PlanBlock titleKey="p8.admin.plans.personal_title" stateKey="p8.admin.plans.state_default">
            <p className="text-sm leading-relaxed text-zinc-400">{t("p8.admin.plans.personal_notes")}</p>
          </PlanBlock>

          <PlanBlock titleKey="p8.admin.plans.premium_title" stateKey="p8.admin.plans.state_disabled">
            <div className="space-y-1.5 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">{t("p8.admin.plans.label_estimated")}</span> {t("p8.admin.plans.premium_price_month")}
              </p>
              <p>
                <span className="text-zinc-500">{t("p8.admin.plans.label_estimated")}</span> {t("p8.admin.plans.premium_price_year")}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500">{t("p8.admin.plans.premium_notes")}</p>
          </PlanBlock>

          <PlanBlock titleKey="p8.admin.plans.pro_title" stateKey="p8.admin.plans.state_disabled">
            <div className="space-y-1.5 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">{t("p8.admin.plans.label_estimated")}</span> {t("p8.admin.plans.pro_price_month")}
              </p>
              <p>
                <span className="text-zinc-500">{t("p8.admin.plans.label_estimated")}</span> {t("p8.admin.plans.pro_price_year")}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500">{t("p8.admin.plans.pro_notes")}</p>
          </PlanBlock>
        </div>
      </div>
    </AdminShell>
  );
}
