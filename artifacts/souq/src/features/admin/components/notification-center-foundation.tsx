import { Bell } from "lucide-react";
import { dashboardContractAttrs } from "@/features/admin/dashboard-contracts";
import { CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const CHANNEL_KEYS = [
  "p8.admin.notifications.channels.ad_approved",
  "p8.admin.notifications.channels.ad_rejected",
  "p8.admin.notifications.channels.ad_review",
  "p8.admin.notifications.channels.reports",
  "p8.admin.notifications.channels.support",
  "p8.admin.notifications.channels.system",
  "p8.admin.notifications.channels.staff",
] as const;

/** Architecture contract only — no backend feed yet (P8C / P15). */
export function NotificationCenterFoundation() {
  return (
    <section
      className={cn(CARD_SHELL, "p-4")}
      aria-labelledby="admin-notifications-foundation-title"
      {...dashboardContractAttrs("monitoring.notification_feed")}
    >
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary">
          <Bell className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-right">
          <h2 id="admin-notifications-foundation-title" className="text-lg font-semibold text-foreground">
            {t("p8.admin.notifications.foundation.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("p8.admin.notifications.foundation.subtitle")}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-950/20 px-3 py-2.5 text-right text-[13px] leading-relaxed text-sky-100/90">
        {t("p8.admin.notifications.foundation.contract_note")}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CHANNEL_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2.5 text-right ring-1 ring-primary/5"
          >
            <p className="text-sm font-medium text-foreground">{t(key)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("p8.admin.notifications.foundation.channel_pending")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
