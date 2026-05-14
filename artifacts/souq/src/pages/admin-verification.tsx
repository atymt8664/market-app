import { useLocation } from "wouter";
import { BadgeCheck, Loader2 } from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import { CARD_SHELL, SUB_CARD } from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const TYPE_KEYS = [
  "admin_verification.type_identity",
  "admin_verification.type_seller",
  "admin_verification.type_business",
  "admin_verification.type_phone",
  "admin_verification.type_email",
] as const;

const STATUS_KEYS = [
  "admin_verification.status_pending",
  "admin_verification.status_approved",
  "admin_verification.status_rejected",
] as const;

export default function AdminVerificationPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();

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

  return (
    <AdminShell activeKey="verification" onLogout={onLogout}>
      <div className="space-y-5" dir="rtl">
        <header className="space-y-2 text-right">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)] ring-1 ring-primary/15">
              <BadgeCheck className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("admin_verification.title")}</h1>
              <p className="text-sm leading-relaxed text-zinc-400">{t("admin_verification.subtitle")}</p>
            </div>
          </div>
        </header>

        <div
          className="rounded-2xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-right text-[13px] font-medium leading-relaxed text-amber-100/95"
          role="status"
        >
          {t("admin_verification.alert_ui_only")}
        </div>

        <div
          className="rounded-2xl border border-sky-500/30 bg-sky-950/20 px-3 py-2.5 text-right text-[13px] leading-relaxed text-sky-100/90"
          role="note"
        >
          {t("admin_verification.alert_future")}
        </div>

        <section className={CARD_SHELL}>
          <h2 className="mb-3 text-right text-base font-semibold text-foreground">{t("admin_verification.statuses_title")}</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_KEYS.map((key) => (
              <span
                key={key}
                className="inline-flex items-center rounded-full border border-primary/35 bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-[0_0_14px_-8px_hsl(var(--primary)/0.2)]"
              >
                {t(key)}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-right text-base font-semibold text-foreground">{t("admin_verification.types_title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TYPE_KEYS.map((key) => (
              <div
                key={key}
                className={cn(
                  SUB_CARD,
                  "border-primary/25 p-4 text-right text-sm text-zinc-300 shadow-[0_0_18px_-12px_hsl(var(--primary)/0.14)]",
                )}
              >
                {t(key)}
              </div>
            ))}
          </div>
        </section>

        <section className={SUB_CARD}>
          <div className="rounded-xl border border-dashed border-primary/30 bg-zinc-950/50 px-4 py-14 text-center shadow-[inset_0_0_24px_-18px_hsl(var(--primary)/0.12)]">
            <p className="text-base font-semibold text-foreground">{t("admin_verification.empty_title")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{t("admin_verification.empty_desc")}</p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
