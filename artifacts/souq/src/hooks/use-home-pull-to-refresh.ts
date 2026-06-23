import { useCallback, useEffect, useRef, useState } from "react";
import { APP_SHELL_CONTENT_SCROLL_MARKER, APP_SHELL_CONTENT_SCROLL_VALUE } from "@/lib/app-shell-layout";

export const HOME_PTR_THRESHOLD_PX = 56;
export const HOME_PTR_MAX_PULL_PX = 108;
export const HOME_PTR_REFRESH_HOLD_PX = 56;
export const HOME_PTR_SCROLL_TOP_EPS_PX = 6;

export type HomePullToRefreshPhase = "idle" | "pulling" | "refreshing" | "snap-back";

type UseHomePullToRefreshOptions = {
  scrollRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
  /** Fires once per pull when finger moves down from the top — cancel competing row gestures. */
  onPullGestureStart?: () => void;
};

/** Desktop mouse-only — skip PTR; touch laptops still allowed. */
function isDesktopFinePointerOnly(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(pointer: coarse)").matches
  );
}

function resolveHomeScrollEl(scrollRef: React.RefObject<HTMLElement | null>): HTMLElement | null {
  if (scrollRef.current) return scrollRef.current;
  return document.querySelector(
    `[${APP_SHELL_CONTENT_SCROLL_MARKER}="${APP_SHELL_CONTENT_SCROLL_VALUE}"]`,
  );
}

function touchWithinScrollViewport(scrollEl: HTMLElement, clientY: number): boolean {
  const rect = scrollEl.getBoundingClientRect();
  return clientY >= rect.top && clientY <= rect.bottom;
}

export function useHomePullToRefresh({
  scrollRef,
  enabled,
  onRefresh,
  onPullGestureStart,
}: UseHomePullToRefreshOptions) {
  const [pullPx, setPullPx] = useState(0);
  const [phase, setPhase] = useState<HomePullToRefreshPhase>("idle");

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const pullPxRef = useRef(0);
  pullPxRef.current = pullPx;

  const touchStartYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullGestureStartedRef = useRef(false);
  const scrollElRef = useRef<HTMLElement | null>(null);

  const onPullGestureStartRef = useRef(onPullGestureStart);
  onPullGestureStartRef.current = onPullGestureStart;

  const resetPull = useCallback(() => {
    pullingRef.current = false;
    setPullPx(0);
    setPhase("idle");
  }, []);

  const finishRefresh = useCallback(() => {
    setPhase("snap-back");
    setPullPx(HOME_PTR_REFRESH_HOLD_PX);
    window.requestAnimationFrame(() => {
      setPullPx(0);
      window.setTimeout(() => {
        if (phaseRef.current === "snap-back") resetPull();
      }, 240);
    });
  }, [resetPull]);

  const triggerRefresh = useCallback(async () => {
    if (phaseRef.current === "refreshing") return;
    setPhase("refreshing");
    setPullPx(HOME_PTR_REFRESH_HOLD_PX);
    try {
      await onRefresh();
    } finally {
      finishRefresh();
    }
  }, [onRefresh, finishRefresh]);

  useEffect(() => {
    if (!enabled || isDesktopFinePointerOnly()) return;

    let cancelled = false;
    let boundScrollEl: HTMLElement | null = null;

    const bind = () => {
      if (cancelled) return;
      boundScrollEl = resolveHomeScrollEl(scrollRef);
      scrollElRef.current = boundScrollEl;
    };

    bind();
    const bindRetry = window.setTimeout(bind, 0);

    const getScrollEl = () => scrollElRef.current ?? resolveHomeScrollEl(scrollRef);

    const onTouchStart = (event: TouchEvent) => {
      const scrollEl = getScrollEl();
      if (!scrollEl || phaseRef.current === "refreshing") return;

      const touch = event.touches[0];
      if (!touch) return;
      if (!scrollEl.contains(event.target as Node)) return;
      if (!touchWithinScrollViewport(scrollEl, touch.clientY)) return;
      if (scrollEl.scrollTop > HOME_PTR_SCROLL_TOP_EPS_PX) return;

      touchStartYRef.current = touch.clientY;
      pullingRef.current = true;
      pullGestureStartedRef.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || phaseRef.current === "refreshing") return;

      const scrollEl = getScrollEl();
      if (!scrollEl) return;

      if (scrollEl.scrollTop > HOME_PTR_SCROLL_TOP_EPS_PX) {
        pullingRef.current = false;
        setPullPx(0);
        setPhase("idle");
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;

      const delta = touch.clientY - touchStartYRef.current;
      if (delta <= 0) {
        setPullPx(0);
        setPhase("idle");
        return;
      }

      // Below pull-commit threshold — allow synthetic click on inbox rows / cards.
      if (delta <= 4) return;

      if (!pullGestureStartedRef.current) {
        pullGestureStartedRef.current = true;
        onPullGestureStartRef.current?.();
      }

      event.preventDefault();
      const damped = Math.min(delta * 0.55, HOME_PTR_MAX_PULL_PX);
      setPullPx(damped);
      setPhase("pulling");
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      pullGestureStartedRef.current = false;

      if (phaseRef.current === "refreshing") return;

      if (pullPxRef.current >= HOME_PTR_THRESHOLD_PX) {
        void triggerRefresh();
        return;
      }

      if (pullPxRef.current <= 0 && phaseRef.current === "idle") {
        resetPull();
        return;
      }

      setPhase("snap-back");
      setPullPx(0);
      window.setTimeout(() => {
        if (phaseRef.current === "snap-back") resetPull();
      }, 240);
    };

    /** Capture on document — reliable on Android Chrome when touch starts on nested cards. */
    const captureOpts = { capture: true } as const;
    document.addEventListener("touchstart", onTouchStart, { ...captureOpts, passive: true });
    document.addEventListener("touchmove", onTouchMove, { ...captureOpts, passive: false });
    document.addEventListener("touchend", onTouchEnd, { ...captureOpts, passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { ...captureOpts, passive: true });

    return () => {
      cancelled = true;
      window.clearTimeout(bindRetry);
      document.removeEventListener("touchstart", onTouchStart, captureOpts);
      document.removeEventListener("touchmove", onTouchMove, captureOpts);
      document.removeEventListener("touchend", onTouchEnd, captureOpts);
      document.removeEventListener("touchcancel", onTouchEnd, captureOpts);
    };
  }, [enabled, scrollRef, triggerRefresh, resetPull]);

  const progress = Math.min(pullPx / HOME_PTR_THRESHOLD_PX, 1);

  return {
    pullPx,
    phase,
    progress,
    isActive: pullPx > 0 || phase === "refreshing" || phase === "snap-back",
  };
}
