import { OverlayPullToRefreshIndicator } from "@/components/overlay-pull-to-refresh-indicator";
import type { HomePullToRefreshPhase } from "@/hooks/use-home-pull-to-refresh";

type MessagesPullToRefreshIndicatorProps = {
  pullPx: number;
  progress: number;
  phase: HomePullToRefreshPhase;
};

/** Messages inbox PTR indicator — thin wrapper over shared overlay glyph. */
export function MessagesPullToRefreshIndicator(props: MessagesPullToRefreshIndicatorProps) {
  return (
    <OverlayPullToRefreshIndicator
      {...props}
      testId="messages-pull-to-refresh-indicator"
      dataPrefix="messages-ptr"
    />
  );
}
