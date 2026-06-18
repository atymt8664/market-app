/**
 * P9-3E — App Shell L0/L4 safe-area bootstrap (standalone / PWA / TWA).
 * P9-IOS-A2HS-REAL-DEVICE — iOS A2HS-only safe-top fallback + document class for critical CSS.
 */

import {
  IOS_A2HS_DOCUMENT_CLASS,
  PLATFORM_HEADER_SAFE_TOP_CLASS,
} from "@/lib/platform-header-safe-area";

export const SOUQ_SAFE_TOP_VAR = "var(--souq-safe-top, env(safe-area-inset-top, 0px))";
export const SOUQ_SAFE_BOTTOM_VAR = "var(--souq-safe-bottom, env(safe-area-inset-bottom, 0px))";

/** L1 Home header — L0 safe-top consumer. */
export const HOME_FIXED_HEADER_SAFE_TOP_CLASS = PLATFORM_HEADER_SAFE_TOP_CLASS;

/** iPhone / iPad WebKit (Safari + A2HS standalone). */
export function isIosWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

/**
 * iPhone A2HS only — mandatory gate for safe-top fallback + ios-a2hs critical CSS.
 * Do NOT use display-mode: standalone (Android TWA would match).
 */
export function isIosA2hsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return isIosWebKit() && nav.standalone === true;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function probeEnvSafeAreaInsets(): { top: number; bottom: number } {
  if (typeof document === "undefined") return { top: 0, bottom: 0 };
  const root = document.documentElement;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:constant(safe-area-inset-top);padding-bottom:constant(safe-area-inset-bottom);padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  root.appendChild(probe);
  const styles = getComputedStyle(probe);
  const top = parseFloat(styles.paddingTop) || 0;
  const bottom = parseFloat(styles.paddingBottom) || 0;
  probe.remove();
  return { top, bottom };
}

/**
 * iOS A2HS fallback when env() probe returns 0 on real devices.
 * visualViewport is often 0 at boot — use screen dimension heuristics next.
 */
export function measureIosA2hsSafeTopFallback(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (vv && vv.offsetTop > 0) return Math.round(vv.offsetTop);

  const screenMax = Math.max(window.screen.width, window.screen.height);
  const screenMin = Math.min(window.screen.width, window.screen.height);
  // Dynamic Island iPhones (14 Pro+, 15+, 16+) — portrait logical height ≥ 852
  if (screenMax >= 852 && screenMin >= 393) return 59;
  // Notch iPhones X through 14/SE — logical height ≥ 812
  if (screenMax >= 812) return 47;
  // Pre-notch status bar
  if (screenMax >= 568) return 20;
  return 47;
}

function syncIosA2hsDocumentClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(IOS_A2HS_DOCUMENT_CLASS, isIosA2hsStandalone());
}

function applySafeTopVar(top: number): void {
  const root = document.documentElement;
  if (top > 0) {
    root.style.setProperty("--souq-safe-top", `${top}px`);
  } else {
    root.style.removeProperty("--souq-safe-top");
  }
}

function applySafeBottomVar(bottom: number): void {
  const root = document.documentElement;
  if (bottom > 0) {
    root.style.setProperty("--souq-safe-bottom", `${bottom}px`);
  } else {
    root.style.removeProperty("--souq-safe-bottom");
  }
}

function syncIosA2hsBottomNavL4Vars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isIosA2hsStandalone()) {
    root.style.removeProperty("--souq-safe-bottom");
    root.style.removeProperty("--souq-bottom-nav-drop");
  }
}

/** Standalone-only inset probe — sets CSS vars; iOS A2HS gets fallback when env()=0. */
export function syncStandaloneSafeAreaCssVars(): void {
  if (typeof document === "undefined" || !isStandaloneDisplayMode()) return;
  syncIosA2hsDocumentClass();
  syncIosA2hsBottomNavL4Vars();
  const { top, bottom } = probeEnvSafeAreaInsets();
  let resolvedTop = top;
  if (resolvedTop <= 0 && isIosA2hsStandalone()) {
    resolvedTop = measureIosA2hsSafeTopFallback();
  }
  applySafeTopVar(resolvedTop);
  // L4: iOS A2HS uses env() via CSS fallback on chrome panel — avoid JS var double-count.
  if (isIosA2hsStandalone()) {
    applySafeBottomVar(0);
  } else {
    applySafeBottomVar(bottom);
  }
}

const IOS_A2HS_RESYNC_DELAYS_MS = [0, 50, 150, 350, 750];

export function installStandaloneSafeAreaListeners(): void {
  if (typeof window === "undefined" || !isStandaloneDisplayMode()) return;
  document.documentElement.classList.add("standalone-pwa");
  const sync = () => syncStandaloneSafeAreaCssVars();
  for (const delay of IOS_A2HS_RESYNC_DELAYS_MS) {
    if (delay === 0) sync();
    else window.setTimeout(sync, delay);
  }
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", () => {
    for (const delay of [100, 350, 750]) {
      window.setTimeout(sync, delay);
    }
  });
  if (isIosA2hsStandalone() && window.visualViewport) {
    window.visualViewport.addEventListener("resize", sync);
    window.visualViewport.addEventListener("scroll", sync);
  }
}
