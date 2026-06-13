import { useEffect, useState } from "react";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

/** Run after paint — single rAF on iOS Safari; double rAF + idle elsewhere. */
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

  const scheduleIdle = () => {
    if (cancelled) return;
    const ric = window.requestIdleCallback;
    if (ric) {
      idleId = ric(run, { timeout: Math.min(idleTimeoutMs, 800) });
    } else {
      timeoutId = window.setTimeout(run, 1);
    }
  };

  const frameId = requestAnimationFrame(() => {
    if (isIosSafari()) {
      run();
      return;
    }
    requestAnimationFrame(() => {
      if (cancelled) return;
      scheduleIdle();
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
