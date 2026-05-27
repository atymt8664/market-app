import type { SlaState } from "@/features/admin/operations-queue-types";
import { slaStateClass } from "@/features/admin/operations-queue-types";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type SlaStatusBadgeProps = {
  state: SlaState;
  minutesRemaining?: number | null;
};

function slaStateLabel(state: SlaState): string {
  return t(`p8.admin.sla.${state}`);
}

export function SlaStatusBadge({ state, minutesRemaining }: SlaStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        slaStateClass(state),
      )}
    >
      {slaStateLabel(state)}
      {minutesRemaining != null && state !== "exceeded" ? (
        <span className="opacity-80">{t("p8.admin.sla.minutes_short", { minutes: minutesRemaining })}</span>
      ) : null}
    </span>
  );
}
