import type { ReactNode } from "react";
import { OverlayPullToRefreshIndicator } from "@/components/overlay-pull-to-refresh-indicator";
import { useHomePullToRefresh } from "@/hooks/use-home-pull-to-refresh";

type OverlayPullToRefreshProps = {
  scrollRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
  onPullGestureStart?: () => void;
  indicatorTestId?: string;
  dataPrefix?: string;
  contentMarker?: string;
  tuckUnderHeaderPx?: number;
};

/**
 * Tab-page overlay PTR — indicator only; no content translateY (Messages pattern).
 * Refetches via onRefresh; chrome / BottomNav untouched.
 */
export function OverlayPullToRefresh({
  scrollRef,
  enabled,
  onRefresh,
  children,
  onPullGestureStart,
  indicatorTestId,
  dataPrefix = "overlay-ptr",
  contentMarker = "overlay-ptr-content",
  tuckUnderHeaderPx,
}: OverlayPullToRefreshProps) {
  const { pullPx, phase, progress } = useHomePullToRefresh({
    scrollRef,
    enabled,
    onRefresh,
    onPullGestureStart,
  });

  return (
    <>
      <OverlayPullToRefreshIndicator
        pullPx={pullPx}
        progress={progress}
        phase={phase}
        testId={indicatorTestId}
        dataPrefix={dataPrefix}
        tuckUnderHeaderPx={tuckUnderHeaderPx}
      />
      <div data-overlay-ptr-content={contentMarker}>{children}</div>
    </>
  );
}
