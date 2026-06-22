/**
 * P11 — Web splash overlay: seamless handoff from native TWA splash → first content paint.
 * Static shell in index.html; React dismisses when route content is ready.
 */

export const WEB_SPLASH_OVERLAY_ID = "p11-web-splash-overlay";
export const WEB_SPLASH_DISMISS_CLASS = "p11-splash-dismiss";
/** Hard cap — never block the app if feed/route readiness stalls. */
export const WEB_SPLASH_MAX_MS = 12_000;
export const WEB_SPLASH_FADE_MS = 220;

export function isWebSplashOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(WEB_SPLASH_OVERLAY_ID);
  return !!el && !el.classList.contains(WEB_SPLASH_DISMISS_CLASS);
}

/** Dismiss with a short fade — idempotent. */
export function dismissWebSplashOverlay(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(WEB_SPLASH_OVERLAY_ID);
  if (!el || el.classList.contains(WEB_SPLASH_DISMISS_CLASS)) return;
  el.classList.add(WEB_SPLASH_DISMISS_CLASS);
  window.setTimeout(() => {
    el.remove();
  }, WEB_SPLASH_FADE_MS + 40);
}
