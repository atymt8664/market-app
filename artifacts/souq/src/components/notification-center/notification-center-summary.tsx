import { formatBadgeCount } from "@/lib/app-badge-counters";
import type { NotificationCenterSummary } from "@/lib/notification-center-stats";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { appTextAlignClass } from "@/lib/app-text-direction";

type NotificationCenterSummaryProps = {
  summary: NotificationCenterSummary;
};

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded-2xl border px-3 py-2.5 ring-1 sm:px-3.5 sm:py-3",
        highlight
          ? "border-primary/45 bg-primary/10 ring-primary/22 shadow-[0_0_20px_-14px_hsl(var(--primary)/0.32)]"
          : "border-primary/20 bg-[#0A0A0A]/75 ring-primary/10",
      )}
    >
      <span
        dir="ltr"
        className={cn(
          "text-xl font-bold tabular-nums leading-none sm:text-2xl",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {formatBadgeCount(value)}
      </span>
      <span className={cn("text-[11px] font-medium text-zinc-400 sm:text-xs", appTextAlignClass())}>
        {label}
      </span>
    </div>
  );
}

export function NotificationCenterSummaryBar({ summary }: NotificationCenterSummaryProps) {
  return (
    <section
      className="mx-auto w-full max-w-lg md:max-w-xl"
      aria-label={t("notifications.summary_aria")}
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <StatCard
          label={t("notifications.summary.unread")}
          value={summary.unread}
          highlight={summary.unread > 0}
        />
        <StatCard label={t("notifications.summary.today")} value={summary.today} />
        <StatCard label={t("notifications.summary.week")} value={summary.week} />
      </div>
    </section>
  );
}
