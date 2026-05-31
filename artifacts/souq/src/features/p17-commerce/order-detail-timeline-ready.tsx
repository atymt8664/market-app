import { Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderTimelineEntry } from "./orders-api.types";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";

/** P17-4C — timeline step ids (architecture fallback when API has no events). */
export const ORDER_DETAIL_TIMELINE_STEPS = [
  "p17.commerce.detail.timeline_step_created",
  "p17.commerce.detail.timeline_step_confirmed",
  "p17.commerce.detail.timeline_step_preparing",
  "p17.commerce.detail.timeline_step_shipped",
  "p17.commerce.detail.timeline_step_delivered",
] as const;

type OrderDetailTimelineReadyProps = {
  entries?: OrderTimelineEntry[];
  isLoading?: boolean;
};

export function OrderDetailTimelineReady({ entries = [], isLoading = false }: OrderDetailTimelineReadyProps) {
  const hasData = entries.length > 0;

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-timeline">
      <p className={cn(ORDERS_CARD_TITLE, "mb-2")}>{t("p17.commerce.detail.timeline_title")}</p>

      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl bg-primary/10" aria-busy="true" />
      ) : hasData ? (
        <ol className="flex flex-col gap-0" data-testid="p17-order-detail-timeline-steps">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center">
                <Circle className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                <div className="mt-1 min-h-[1.25rem] w-0.5 flex-1 rounded-full bg-zinc-800 last:hidden" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5 text-right">
                <p className="text-sm font-medium text-foreground">{entry.messageAr}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p
          className="py-2 text-center text-[11px] leading-relaxed text-zinc-500 md:text-xs"
          data-testid="p17-order-detail-timeline-empty"
        >
          {t("p17.commerce.detail.timeline_empty")}
        </p>
      )}
    </div>
  );
}
