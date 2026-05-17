import { useEffect, useState } from "react";

/** Run after paint (double rAF) then idle — avoids competing with first Gate/Home paint. */
export function scheduleAfterFirstPaint(
  callback: () => void,
  idleTimeoutMs = 2000,
): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  let idleId: number | undefined;
  let timeoutId: number | undefined;

  const run = () => {
    if (!cancelled) callback();
  };

  const frameId = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (cancelled) return;
      const ric = window.requestIdleCallback;
      if (ric) {
        idleId = ric(run, { timeout: idleTimeoutMs });
      } else {
        timeoutId = window.setTimeout(run, 1);
      }
    });
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    if (idleId !== undefined && window.cancelIdleCallback) {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}

export function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => scheduleAfterFirstPaint(() => setReady(true)), []);

  return ready;
}
