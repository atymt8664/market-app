import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { MessagesPullToRefreshIndicator } from "@/components/messages-pull-to-refresh-indicator";
import { useHomePullToRefresh } from "@/hooks/use-home-pull-to-refresh";
import {
  markMessagesPtrGestureRelease,
  setMessagesPtrActive,
} from "@/lib/messages-inbox-ptr-gesture";

type MessagesPullToRefreshProps = {
  scrollRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
  /** Wired from Messages page — cancels inbox long-press as soon as PTR pull starts. */
  onPullGestureStart?: () => void;
};

const PTR_ACTIVE_PULL_PX = 8;

/**
 * Messages inbox PTR — indicator only; no content translateY (unlike Home).
 * Refetches conversations query; WebSocket/realtime unchanged.
 */
export function MessagesPullToRefresh({
  scrollRef,
  enabled,
  onRefresh,
  children,
  onPullGestureStart,
}: MessagesPullToRefreshProps) {
  const onPullStartRef = useRef(onPullGestureStart);
  onPullStartRef.current = onPullGestureStart;

  const handlePullGestureStart = useCallback(() => {
    setMessagesPtrActive(true);
    onPullStartRef.current?.();
  }, []);

  const { pullPx, phase, progress } = useHomePullToRefresh({
    scrollRef,
    enabled,
    onRefresh,
    onPullGestureStart: handlePullGestureStart,
  });

  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    // Snap-back must not block inbox taps — post-pull suppression uses suppressTapUntil.
    const active =
      pullPx > PTR_ACTIVE_PULL_PX || phase === "pulling" || phase === "refreshing";
    setMessagesPtrActive(active);
  }, [phase, pullPx]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (
      prev === "pulling" &&
      (phase === "refreshing" || phase === "snap-back" || phase === "idle")
    ) {
      markMessagesPtrGestureRelease();
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => setMessagesPtrActive(false);
  }, []);

  return (
    <>
      <MessagesPullToRefreshIndicator pullPx={pullPx} progress={progress} phase={phase} />
      <div data-messages-ptr-content="1">{children}</div>
    </>
  );
}
