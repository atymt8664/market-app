import { Circle } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";

/** P17-4C — timeline step ids (architecture only; no runtime mock progress). */
export const ORDER_DETAIL_TIMELINE_STEPS = [
  "p17.commerce.detail.timeline_step_created",
  "p17.commerce.detail.timeline_step_confirmed",
  "p17.commerce.detail.timeline_step_preparing",
  "p17.commerce.detail.timeline_step_shipped",
  "p17.commerce.detail.timeline_step_delivered",
] as const;

type OrderDetailTimelineReadyProps = {
  /** When true, renders step architecture; when false, empty ready message only. */
  hasData?: boolean;
};

export function OrderDetailTimelineReady({ hasData = false }: OrderDetailTimelineReadyProps) {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-timeline">
      <p className={cn(ORDERS_CARD_TITLE, "mb-2")}>{t("p17.commerce.detail.timeline_title")}</p>

      {hasData ? (
        <ol className="flex flex-col gap-0" data-testid="p17-order-detail-timeline-steps">
          {ORDER_DETAIL_TIMELINE_STEPS.map((stepKey) => (
            <li key={stepKey} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center">
                <Circle className="h-5 w-5 shrink-0 text-zinc-600" strokeWidth={2} />
                <div className="mt-1 min-h-[1.25rem] w-0.5 flex-1 rounded-full bg-zinc-800 last:hidden" />
              </div>
              <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium text-zinc-500">{t(stepKey)}</p>
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
