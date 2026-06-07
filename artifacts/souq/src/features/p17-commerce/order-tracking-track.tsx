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
import "./order-tracking-track.css";

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
          "relative z-20 flex shrink-0 items-center justify-center rounded-full bg-primary",
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
          "p17-tracking-node-current relative z-20 flex shrink-0 items-center justify-center rounded-full border-2 border-primary bg-[#0A0A0A] shadow-[0_0_10px_rgba(194,235,108,0.35)]",
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
        "relative z-20 shrink-0 rounded-full border-2 border-zinc-600 bg-[#0A0A0A]",
        compact ? "h-3.5 w-3.5" : "h-4 w-4",
      )}
      aria-hidden
    />
  );
}

type JourneyGeometry = {
  solidEnd: number;
  activeStart: number;
  activeEnd: number;
  showActive: boolean;
  allCompleted: boolean;
};

function journeyGeometry(
  stepCount: number,
  currentIndex: number,
  nodeStates: TrackingNodeState[],
): JourneyGeometry {
  const denom = Math.max(1, stepCount - 1);
  const allCompleted = nodeStates.every((s) => s === "completed");

  if (allCompleted) {
    return { solidEnd: 1, activeStart: 1, activeEnd: 1, showActive: false, allCompleted: true };
  }

  if (currentIndex < 0) {
    return { solidEnd: 0, activeStart: 0, activeEnd: 0, showActive: false, allCompleted: false };
  }

  const solidEnd = currentIndex / denom;
  const activeStart = solidEnd;
  const activeEnd = Math.min(1, (currentIndex + 1) / denom);
  const showActive = currentIndex < stepCount - 1;

  return { solidEnd, activeStart, activeEnd, showActive, allCompleted: false };
}

/** P17-8-0 — RTL continuous journey track (mobile-first). */
export function OrderTrackingTrack({ order, isLoading = false, compact = false }: OrderTrackingTrackProps) {
  const model = resolveTrackingTrackModel(order);
  const stepCount = model.steps.length;
  const nodeLane = compact ? "h-5" : "h-6";
  const railInset = `calc(100% / ${stepCount * 2})`;
  const journey = journeyGeometry(stepCount, model.currentIndex, model.nodeStates);

  return (
    <div
      className={cn(ORDERS_CARD_COMPACT, "border border-primary/20 py-3")}
      data-testid="p17-order-tracking-track"
    >
      <p className={cn(ORDERS_CARD_TITLE, "mb-3")}>{t("p17.commerce.tracking.title")}</p>

      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-xl bg-primary/10" aria-busy="true" />
      ) : (
        <div className="w-full overflow-visible px-0.5" data-testid="p17-tracking-track-scroll">
          <div className="w-full" data-testid="p17-tracking-track-row" dir="rtl">
            <div
              className="relative grid w-full gap-y-1"
              style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}
            >
              <div
                className="pointer-events-none absolute z-0 h-0.5"
                style={{
                  top: compact ? 10 : 11,
                  left: railInset,
                  right: railInset,
                }}
                data-testid="p17-journey-rail"
                aria-hidden
              >
                <div className="relative h-full w-full overflow-hidden rounded-full p17-journey-rail-muted">
                  <div
                    className="absolute inset-y-0 right-0 rounded-full p17-journey-rail-solid"
                    style={{ width: `${journey.solidEnd * 100}%` }}
                    data-testid="p17-journey-rail-solid"
                  />
                  {journey.showActive ? (
                    <div
                      className="absolute inset-y-0 overflow-hidden rounded-full"
                      style={{
                        right: `${journey.activeStart * 100}%`,
                        width: `${(journey.activeEnd - journey.activeStart) * 100}%`,
                      }}
                      data-testid={`p17-tracking-segment-${model.currentIndex}`}
                      data-segment="active"
                    >
                      <div className="absolute inset-0 p17-journey-rail-active-lane" aria-hidden />
                      <div className="p17-journey-travel-pulse" aria-hidden />
                    </div>
                  ) : null}
                </div>
              </div>

              {model.steps.map((stepId, index) => {
                const label = t(TRACKING_STEP_I18N[stepId]);
                const nodeState = model.nodeStates[index]!;

                return (
                  <div key={stepId} className="relative z-10 flex min-w-0 flex-col items-center">
                    <div className={cn(nodeLane, "flex w-full items-center justify-center")}>
                      <TrackingNode state={nodeState} stepId={stepId} compact={compact} />
                    </div>
                    <p
                      className={cn(
                        "mt-1 w-full px-px text-center text-[8px] leading-[1.15] md:text-[9px]",
                        nodeState === "current"
                          ? "font-medium text-primary"
                          : nodeState === "completed"
                            ? "text-zinc-300"
                            : "text-zinc-600",
                      )}
                      title={label}
                    >
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
