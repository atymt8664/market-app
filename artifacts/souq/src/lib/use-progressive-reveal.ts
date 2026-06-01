import { useCallback, useEffect, useRef, useState } from "react";

type ProgressiveRevealOptions = {
  /** First paint batch size. */
  initial?: number;
  /** Items added per scroll intersection or idle tick. */
  step?: number;
  /** When false, reveal all items immediately. */
  enabled?: boolean;
  /** Expand one batch after idle even without scroll (ms timeout for requestIdleCallback). */
  idleExpandMs?: number;
};

/**
 * Progressive list reveal — mounts DOM + image requests only for visible batches.
 * Used on Home feed to avoid loading 20+ cards/images before the user scrolls.
 */
export function useProgressiveReveal<T>(
  items: T[] | undefined,
  {
    initial = 4,
    step = 4,
    enabled = true,
    idleExpandMs = 1500,
  }: ProgressiveRevealOptions = {},
): {
  visible: T[];
  hasMore: boolean;
  sentinelRef: (node: HTMLElement | null) => void;
} {
  const length = items?.length ?? 0;
  const [count, setCount] = useState(initial);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelNodeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setCount(enabled ? initial : length);
  }, [length, initial, enabled]);

  const revealMore = useCallback(() => {
    setCount((prev) => {
      if (prev >= length) return prev;
      return Math.min(length, prev + step);
    });
  }, [length, step]);

  useEffect(() => {
    if (!enabled || length <= initial) return;
    const ric = window.requestIdleCallback;
    if (!ric) {
      const t = window.setTimeout(revealMore, 800);
      return () => window.clearTimeout(t);
    }
    const id = ric(revealMore, { timeout: idleExpandMs });
    return () => window.cancelIdleCallback(id);
  }, [enabled, length, initial, revealMore, idleExpandMs]);

  const attachObserver = useCallback(
    (node: HTMLElement | null) => {
      sentinelNodeRef.current = node;
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || !enabled || length <= count) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) revealMore();
        },
        { rootMargin: "240px 0px" },
      );
      observerRef.current.observe(node);
    },
    [count, enabled, length, revealMore],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const visible = enabled ? (items?.slice(0, count) ?? []) : (items ?? []);
  const hasMore = enabled && count < length;

  return { visible, hasMore, sentinelRef: attachObserver };
}
