/**
 * P9-3E — Standalone / PWA / TWA safe-area parity (browser uses env(); standalone probes insets).
 */

export const SOUQ_SAFE_TOP_VAR = "var(--souq-safe-top, env(safe-area-inset-top, 0px))";
export const SOUQ_SAFE_BOTTOM_VAR = "var(--souq-safe-bottom, env(safe-area-inset-bottom, 0px))";

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** Re-measure env() insets — complements index.html bootstrap on resize / orientation. */
export function syncStandaloneSafeAreaCssVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  root.appendChild(probe);
  const style = getComputedStyle(probe);
  const top = parseFloat(style.paddingTop) || 0;
  const right = parseFloat(style.paddingRight) || 0;
  const bottom = parseFloat(style.paddingBottom) || 0;
  const left = parseFloat(style.paddingLeft) || 0;
  probe.remove();
  root.style.setProperty("--souq-safe-top", `${top}px`);
  root.style.setProperty("--souq-safe-right", `${right}px`);
  root.style.setProperty("--souq-safe-bottom", `${bottom}px`);
  root.style.setProperty("--souq-safe-left", `${left}px`);
}

export function installStandaloneSafeAreaListeners(): void {
  if (typeof window === "undefined") return;
  if (isStandaloneDisplayMode()) {
    document.documentElement.classList.add("standalone-pwa");
  }
  const sync = () => syncStandaloneSafeAreaCssVars();
  sync();
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(sync, 100);
  });
}
