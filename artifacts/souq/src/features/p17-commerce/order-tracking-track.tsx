import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { t, getLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderDetail, OrderTimelineEntry } from "./orders-api.types";
import {
  TRACKING_STEP_I18N,
  resolveTrackingTrackModel,
  type TrackingNodeState,
  type TrackingStepId,
} from "./order-tracking-track-mapping";
import {
  buildCarrierTrackingUrl,
  resolveCarrierProfile,
} from "./order-tracking-carrier-readiness";
import {
  buildShipmentEvents,
  buildTrackingDateChips,
  formatTrackingChipDate,
  formatTrackingEtaDate,
  hasTrackingDetails,
} from "./order-tracking-enrichment";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";
import "./order-tracking-track.css";

type OrderTrackingTrackProps = {
  order: OrderDetail;
  timelineItems?: OrderTimelineEntry[];
  timelineLoading?: boolean;
  isLoading?: boolean;
  /** Seller read-only — slightly denser horizontal layout */
  compact?: boolean;
  /** Detail page — tighter chrome, enhanced horizontal readability */
  premiumCompact?: boolean;
};

function TrackingNode({
  state,
  stepId,
  compact,
  enhanced,
}: {
  state: TrackingNodeState;
  stepId: TrackingStepId;
  compact?: boolean;
  enhanced?: boolean;
}) {
  const size = compact
    ? "h-4 w-4"
    : enhanced
      ? state === "current"
        ? "h-6 w-6"
        : state === "completed"
          ? "h-5 w-5"
          : "h-4 w-4"
      : state === "current"
        ? "h-6 w-6"
        : "h-5 w-5";

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
        compact ? "h-3.5 w-3.5" : enhanced ? "h-4 w-4 border-zinc-500" : "h-4 w-4",
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

function resolveCurrentStepLabelKey(order: Pick<OrderDetail, "status" | "fulfillmentMode">): string {
  const model = resolveTrackingTrackModel(order);
  const currentIndex = model.currentIndex;
  if (currentIndex < 0) return TRACKING_STEP_I18N.placed;
  const stepId = model.steps[currentIndex] as TrackingStepId | undefined;
  return stepId ? TRACKING_STEP_I18N[stepId] : TRACKING_STEP_I18N.placed;
}

function CopyTrackingButton({ trackingNumber }: { trackingNumber: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-[10px] text-primary"
      data-testid="p17-tracking-copy-number"
      onClick={() => void handleCopy()}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" aria-hidden />
          {t("p17.commerce.tracking.copy_done")}
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden />
          {t("p17.commerce.tracking.copy_number")}
        </>
      )}
    </button>
  );
}

/** P17-8 — RTL continuous journey track + Package 2 enrichment (mobile-first). */
export function OrderTrackingTrack({
  order,
  timelineItems = [],
  timelineLoading = false,
  isLoading = false,
  compact = false,
  premiumCompact = false,
}: OrderTrackingTrackProps) {
  const locale = getLocale();
  const model = resolveTrackingTrackModel(order);
  const stepCount = model.steps.length;
  const enhanced = premiumCompact && !compact;
  const nodeLane = compact ? "h-5" : enhanced ? "h-7" : "h-6";
  const railInset = `calc(100% / ${stepCount * 2})`;
  const journey = journeyGeometry(stepCount, model.currentIndex, model.nodeStates);

  const currentStepKey = resolveCurrentStepLabelKey(order);
  const dateChips = buildTrackingDateChips(order, timelineItems);
  const shipmentEvents = buildShipmentEvents(order, timelineItems);
  const showDetails = hasTrackingDetails(order);
  const carrierProfile = resolveCarrierProfile(order.shipment?.carrierLabel, order.fulfillmentMode);
  const externalTrackingUrl = buildCarrierTrackingUrl(
    carrierProfile,
    order.shipment?.trackingNumber,
  );
  const showEtaBanner = Boolean(order.fulfillmentMode === "shipping" && order.shipment?.etaAt);

  return (
    <div
      className={cn(
        ORDERS_CARD_COMPACT,
        "border border-primary/25",
        premiumCompact ? "px-2.5 py-2" : "border-primary/20 py-3",
      )}
      data-testid="p17-order-tracking-track"
      data-layout="horizontal"
    >
      <p className={cn(ORDERS_CARD_TITLE, premiumCompact ? "mb-0.5 text-[12px]" : "mb-1")}>
        {t("p17.commerce.tracking.title")}
      </p>

      <p
        className={cn(
          "text-right leading-tight",
          premiumCompact
            ? "mb-1.5 text-[11px] font-medium text-zinc-300"
            : "mb-3 text-[10px] leading-relaxed text-zinc-500 md:text-[11px]",
        )}
        data-testid="p17-tracking-last-updated"
      >
        {t("p17.commerce.tracking.status_relative", {
          status: t(currentStepKey),
          relative: order.updatedAtRelativeAr,
        })}
      </p>

      {showEtaBanner && order.shipment?.etaAt ? (
        <div
          className={cn(
            "rounded-lg border border-primary/25 bg-primary/5 text-right",
            premiumCompact ? "mb-1.5 px-2 py-1" : "mb-3 rounded-xl px-3 py-2",
          )}
          data-testid="p17-tracking-eta"
        >
          <p className={cn(premiumCompact ? "text-[9px]" : "text-[10px]", "text-zinc-500")}>
            {t("p17.commerce.tracking.eta_label")}
          </p>
          <p className={cn(premiumCompact ? "text-[11px]" : "text-[12px]", "font-semibold text-primary")}>
            {formatTrackingEtaDate(order.shipment.etaAt, locale)}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <Skeleton
          className={cn("w-full rounded-xl bg-primary/10", premiumCompact ? "h-16" : "h-14")}
          aria-busy="true"
        />
      ) : (
        <div className="w-full overflow-visible px-0.5" data-testid="p17-tracking-track-scroll">
          <div className="w-full" data-testid="p17-tracking-track-row" dir="rtl">
            <div
              className="relative grid w-full gap-y-0.5"
              style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}
            >
              <div
                className="pointer-events-none absolute z-0 h-0.5"
                style={{
                  top: compact ? 10 : enhanced ? 13 : 11,
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
                      <TrackingNode
                        state={nodeState}
                        stepId={stepId}
                        compact={compact}
                        enhanced={enhanced}
                      />
                    </div>
                    <p
                      className={cn(
                        "w-full px-0.5 text-center leading-tight",
                        enhanced
                          ? "mt-0.5 text-[10px] md:text-[11px]"
                          : "mt-1 text-[8px] leading-[1.15] md:text-[9px]",
                        nodeState === "current"
                          ? "font-semibold text-primary"
                          : nodeState === "completed"
                            ? enhanced
                              ? "font-medium text-zinc-200"
                              : "text-zinc-300"
                            : enhanced
                              ? "text-zinc-500"
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

      {dateChips.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap justify-end gap-1",
            premiumCompact ? "mt-1.5" : "mt-3 gap-1.5",
          )}
          data-testid="p17-tracking-date-chips"
        >
          {dateChips.map((chip) => (
            <span
              key={chip.id}
              className="rounded-full border border-zinc-700 bg-[#0A0A0A] px-2 py-0.5 text-[10px] text-zinc-300"
              data-testid={`p17-tracking-chip-${chip.id}`}
            >
              {t(chip.labelKey, { date: formatTrackingChipDate(chip.isoDate, locale) })}
            </span>
          ))}
        </div>
      ) : null}

      {showDetails ? (
        <div
          className={cn(
            "rounded-lg border border-primary/30 bg-primary/5 text-right",
            premiumCompact ? "mt-1.5 px-2 py-1.5" : "mt-3 rounded-xl px-3 py-2",
          )}
          data-testid="p17-tracking-details"
        >
          <p className="text-[10px] text-zinc-500">{t("p17.commerce.tracking.details_title")}</p>
          <p
            className="text-[11px] font-medium text-primary"
            data-testid="p17-tracking-carrier-label"
            data-carrier-code={carrierProfile.code}
          >
            {carrierProfile.displayLabel || order.shipment!.carrierLabel}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
            <p className="font-mono text-[11px] text-zinc-200" dir="ltr" data-testid="p17-tracking-number">
              {order.shipment!.trackingNumber}
            </p>
            <CopyTrackingButton trackingNumber={order.shipment!.trackingNumber} />
            {externalTrackingUrl ? (
              <a
                href={externalTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary underline-offset-2 hover:underline"
                data-testid="p17-tracking-carrier-link"
                data-carrier-ready="static-url"
              >
                {t("p17.commerce.tracking.carrier_track")}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      ) : order.fulfillmentMode === "pickup" ? (
        <p
          className={cn(
            "text-right text-zinc-400",
            premiumCompact ? "mt-1 text-[10px]" : "mt-3 text-[10px] text-zinc-500",
          )}
          data-testid="p17-tracking-pickup-note"
        >
          {t("p17.commerce.tracking.pickup_only_note")}
        </p>
      ) : null}

      {timelineLoading ? (
        <Skeleton
          className={cn("w-full rounded-xl bg-primary/10", premiumCompact ? "mt-1.5 h-10" : "mt-3 h-16")}
          aria-busy="true"
        />
      ) : shipmentEvents.length > 0 && !premiumCompact ? (
        <div className="mt-3" data-testid="p17-tracking-shipment-events">
          <p className={cn(ORDERS_CARD_TITLE, "mb-2 text-[11px]")}>
            {t("p17.commerce.tracking.events_title")}
          </p>
          <ol className="flex max-h-40 flex-col gap-0 overflow-y-auto pr-0.5">
            {[...shipmentEvents].reverse().map((event) => (
              <li
                key={event.id}
                className="border-b border-zinc-800/80 py-2 text-right last:border-b-0"
                data-testid={`p17-tracking-event-${event.id}`}
              >
                <p className="text-[11px] font-medium text-foreground">{event.messageAr}</p>
                <p className="text-[10px] text-zinc-500">{event.occurredAt.slice(0, 16).replace("T", " · ")}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
