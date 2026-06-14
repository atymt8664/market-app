/**
 * P9-3 / P9-6 — Home cold start contract: boot lock, SW reload gate, iOS shell watchdog.
 */
import { isHomePathname } from "@/lib/p7-home-path";

export type HomeColdStartPhase = "idle" | "booting" | "ready";

let phase: HomeColdStartPhase = "idle";
let pendingSwReload = false;
let readyWaiters: Array<() => void> = [];

/** iPhone / iPad WebKit (Safari + A2HS standalone). */
export function isIosWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function getHomeColdStartPhase(): HomeColdStartPhase {
  return phase;
}

/** Home returning-user boot — blocks SW reload until feed ready or watchdog. */
export function beginHomeColdStartBoot(): void {
  if (!isHomePathname()) return;
  if (phase === "ready") return;
  phase = "booting";
}

export function markHomeColdStartReady(): void {
  if (phase === "ready") return;
  phase = "ready";
  for (const resolve of readyWaiters) resolve();
  readyWaiters = [];
  if (pendingSwReload) {
    pendingSwReload = false;
    window.location.reload();
  }
}

export function isHomeColdStartBootLocked(): boolean {
  return phase === "booting";
}

/** SW controllerchange — defer reload while Home hydrates. */
export function onServiceWorkerControllerChange(): void {
  if (isHomeColdStartBootLocked()) {
    pendingSwReload = true;
    return;
  }
  window.location.reload();
}

export function waitForHomeColdStartReady(timeoutMs = 90_000): Promise<void> {
  if (phase === "ready") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    readyWaiters.push(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

/** Shorter LCP boot wait on iOS WebKit — React must mount sooner on slow WebKit. */
export function getHomeShellLcpBootWaitMs(): number {
  return isIosWebKit() ? 600 : 2_000;
}

/** Force-dismiss static feed shell if still visible (iOS / A2HS stuck guard). */
export const HOME_SHELL_STUCK_MAX_MS = 4_500;

function isFeedShellActive(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.getElementById("p7-lcp-layer")?.querySelector('[data-p7-feed-shell="1"]');
}

export function scheduleHomeShellStuckWatchdog(onForceDismiss: () => void): () => void {
  if (!isHomePathname()) return () => {};
  if (!isIosWebKit() && !isStandalonePwa()) return () => {};
  const id = window.setTimeout(() => {
    if (isFeedShellActive()) onForceDismiss();
  }, HOME_SHELL_STUCK_MAX_MS);
  return () => window.clearTimeout(id);
}
