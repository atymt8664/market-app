import { cn } from "@/lib/utils";
import { OverlayPtrOpenArrow } from "@/components/overlay-ptr-open-arrow";
import {
  HOME_PTR_MAX_PULL_PX,
  HOME_PTR_REFRESH_HOLD_PX,
  HOME_PTR_THRESHOLD_PX,
  type HomePullToRefreshPhase,
} from "@/hooks/use-home-pull-to-refresh";

type OverlayPullToRefreshIndicatorProps = {
  pullPx: number;
  progress: number;
  phase: HomePullToRefreshPhase;
  testId?: string;
  /** DOM data-attribute prefix — default `overlay-ptr`. */
  dataPrefix?: string;
  /**
   * Negative tuck before pull reveals glyph under L1 tab header.
   * Use `0` when page header sits outside the scroll container (profile, notifications).
   */
  tuckUnderHeaderPx?: number;
};

/** Default tuck — L1 tab-title chrome sits above AppShellContentScroll. */
const DEFAULT_TUCK_UNDER_HEADER_PX = 32;
/** Overlay travel vs finger pull — matches Messages PTR. */
const PULL_TRAVEL_RATIO = 1.35;

function overlayPullPx(pullPx: number, phase: HomePullToRefreshPhase): number {
  if (phase === "refreshing") return HOME_PTR_REFRESH_HOLD_PX;
  if (phase === "snap-back") return 0;
  return pullPx;
}

function overlayTranslateY(
  pullPx: number,
  phase: HomePullToRefreshPhase,
  tuckUnderHeaderPx: number,
): number {
  const effective = overlayPullPx(pullPx, phase);
  return -tuckUnderHeaderPx + effective * PULL_TRAVEL_RATIO;
}

/**
 * Overlay PTR indicator — glyph only; list/content rows stay fixed (no content translateY).
 */
export function OverlayPullToRefreshIndicator({
  pullPx,
  progress,
  phase,
  testId = "overlay-pull-to-refresh-indicator",
  dataPrefix = "overlay-ptr",
  tuckUnderHeaderPx = DEFAULT_TUCK_UNDER_HEADER_PX,
}: OverlayPullToRefreshIndicatorProps) {
  if (pullPx <= 0 && phase === "idle") return null;

  const glyphPhase =
    phase === "refreshing" ? "refreshing" : phase === "snap-back" ? "snap-back" : "pulling";

  const translateY = overlayTranslateY(pullPx, phase, tuckUnderHeaderPx);
  const atThreshold = progress >= 1 || pullPx >= HOME_PTR_THRESHOLD_PX;
  const phaseKey = `data-${dataPrefix}-phase` as const;
  const pullKey = `data-${dataPrefix}-pull` as const;
  const thresholdKey = `data-${dataPrefix}-at-threshold` as const;
  const maxPullKey = `data-${dataPrefix}-max-pull` as const;
  const slideKey = `data-${dataPrefix}-slide-y` as const;

  return (
    <div
      className="pointer-events-none sticky top-0 z-40 flex h-0 w-full justify-center overflow-visible"
      data-testid={testId}
      {...{
        [phaseKey]: phase,
        [pullKey]: Math.round(pullPx),
        [thresholdKey]: atThreshold ? "1" : "0",
        [maxPullKey]: HOME_PTR_MAX_PULL_PX,
      }}
      role="status"
      aria-live="polite"
      aria-busy={phase === "refreshing"}
    >
      <div
        className={cn(
          "will-change-transform",
          (phase === "snap-back" || phase === "refreshing") &&
            "transition-transform duration-200 ease-out",
        )}
        style={{
          transform: `translate3d(0, ${translateY}px, 0)`,
        }}
        {...{ [slideKey]: Math.round(translateY) }}
      >
        <OverlayPtrOpenArrow
          progress={progress}
          phase={glyphPhase}
          testId={`${dataPrefix}-open-arrow`}
          glyphTestId={`${dataPrefix}-open-arrow-glyph`}
          rotationAttr={`data-${dataPrefix}-rotation`}
        />
      </div>
    </div>
  );
}
