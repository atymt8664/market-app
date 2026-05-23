import { useCallback, useLayoutEffect, type RefObject } from "react";

const DEFAULT_MIN_PX = 26;
const DEFAULT_MAX_PX = 120;

/**
 * Grows a composer textarea with content up to maxHeight, then scrolls inside the field.
 */
export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  options?: { minPx?: number; maxPx?: number },
) {
  const minPx = options?.minPx ?? DEFAULT_MIN_PX;
  const maxPx = options?.maxPx ?? DEFAULT_MAX_PX;

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const scrollH = el.scrollHeight;
    const next = Math.min(Math.max(scrollH, minPx), maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = scrollH > maxPx ? "auto" : "hidden";
  }, [ref, minPx, maxPx]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, syncHeight]);

  return syncHeight;
}
