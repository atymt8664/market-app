import { Fragment } from "react";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "./orders-api.types";
import {
  TRACKING_STEP_I18N,
  resolveTrackingTrackModel,
  type TrackingNodeState,
  type TrackingStepId,
} from "./order-tracking-track-mapping";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";

type OrderTrackingTrackProps = {
  order: OrderDetail;
  isLoading?: boolean;
  /** Seller read-only — slightly denser layout */
  compact?: boolean;
};

function TrackingNode({
  state,
  stepId,
  compact,
}: {
  state: TrackingNodeState;
  stepId: TrackingStepId;
  compact?: boolean;
}) {
  const size = compact ? "h-4 w-4" : state === "current" ? "h-6 w-6" : "h-5 w-5";

  if (state === "completed") {
    return (
      <div
        data-testid={`p17-tracking-node-${stepId}`}
        data-state="completed"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary",
          size,
        )}
        aria-hidden
      >
        <Check className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", "text-[#0A0A0A]")} strokeWidth={3} />
      </div>
    );
  }

  if (state === "current") {
    return (
      <div
        data-testid={`p17-tracking-node-${stepId}`}
        data-state="current"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border-2 border-primary bg-[#0A0A0A] shadow-[0_0_10px_rgba(194,235,108,0.35)]",
          size,
        )}
        aria-current="step"
      >
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>
    );
  }

  return (
    <div
      data-testid={`p17-tracking-node-${stepId}`}
      data-state="future"
      className={cn(
        "shrink-0 rounded-full border-2 border-zinc-600 bg-[#0A0A0A]",
        compact ? "h-3.5 w-3.5" : "h-4 w-4",
      )}
      aria-hidden
    />
  );
}

function segmentState(left: TrackingNodeState, right: TrackingNodeState): "completed" | "muted" {
  return left === "completed" && right !== "future" ? "completed" : "muted";
}

/** P17-8-0 — horizontal RTL tracking track (Package 1: structure only). */
export function OrderTrackingTrack({ order, isLoading = false, compact = false }: OrderTrackingTrackProps) {
  const model = resolveTrackingTrackModel(order);

  return (
    <div
      className={cn(ORDERS_CARD_COMPACT, "border border-primary/20 py-3")}
      data-testid="p17-order-tracking-track"
    >
      <p className={cn(ORDERS_CARD_TITLE, "mb-3")}>{t("p17.commerce.tracking.title")}</p>

      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-xl bg-primary/10" aria-busy="true" />
      ) : (
        <div className="w-full overflow-x-auto" data-testid="p17-tracking-track-scroll">
          <div className="min-w-[280px] w-full" data-testid="p17-tracking-track-row">
            <div className="flex flex-row-reverse items-center">
              {model.steps.map((stepId, index) => (
                <Fragment key={stepId}>
                  <div className="flex w-11 shrink-0 justify-center md:w-12">
                    <TrackingNode state={model.nodeStates[index]!} stepId={stepId} compact={compact} />
                  </div>
                  {index < model.steps.length - 1 ? (
                    <div
                      className={cn(
                        "h-0.5 min-w-[16px] flex-1 rounded-full",
                        segmentState(model.nodeStates[index]!, model.nodeStates[index + 1]!) === "completed"
                          ? "bg-primary"
                          : "bg-zinc-800",
                      )}
                      data-testid={`p17-tracking-segment-${index}`}
                      data-segment={segmentState(model.nodeStates[index]!, model.nodeStates[index + 1]!)}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              ))}
            </div>
            <div className="mt-1.5 flex flex-row-reverse">
              {model.steps.map((stepId, index) => (
                <Fragment key={`label-${stepId}`}>
                  <p
                    className={cn(
                      "w-11 shrink-0 truncate text-center text-[9px] leading-tight md:w-12 md:text-[10px]",
                      model.nodeStates[index] === "current"
                        ? "font-medium text-primary"
                        : model.nodeStates[index] === "completed"
                          ? "text-zinc-300"
                          : "text-zinc-600",
                    )}
                    title={t(TRACKING_STEP_I18N[stepId])}
                  >
                    {t(TRACKING_STEP_I18N[stepId])}
                  </p>
                  {index < model.steps.length - 1 ? <div className="min-w-[16px] flex-1" aria-hidden /> : null}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
