/**
 * P9-3E — App Shell L0/L4 safe-area bootstrap (standalone / PWA / TWA).
 * L0: --souq-safe-top → consumed by L1 Header Slot.
 * L4: --souq-safe-bottom → owned by L3 Bottom Nav padding-bottom only.
 */

export const SOUQ_SAFE_TOP_VAR = "var(--souq-safe-top, env(safe-area-inset-top, 0px))";
export const SOUQ_SAFE_BOTTOM_VAR = "var(--souq-safe-bottom, env(safe-area-inset-bottom, 0px))";

/** L1 Home header — L0 safe-top consumer. */
export const HOME_FIXED_HEADER_SAFE_TOP_CLASS =
  "pt-[var(--souq-safe-top,env(safe-area-inset-top,0px))]";

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** Standalone-only inset probe — sets CSS vars when env() resolves > 0. */
export function syncStandaloneSafeAreaCssVars(): void {
  if (typeof document === "undefined" || !isStandaloneDisplayMode()) return;
  const root = document.documentElement;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  root.appendChild(probe);
  const styles = getComputedStyle(probe);
  const top = parseFloat(styles.paddingTop) || 0;
  const bottom = parseFloat(styles.paddingBottom) || 0;
  probe.remove();
  if (top > 0) {
    root.style.setProperty("--souq-safe-top", `${top}px`);
  } else {
    root.style.removeProperty("--souq-safe-top");
  }
  if (bottom > 0) {
    root.style.setProperty("--souq-safe-bottom", `${bottom}px`);
  } else {
    root.style.removeProperty("--souq-safe-bottom");
  }
}

export function installStandaloneSafeAreaListeners(): void {
  if (typeof window === "undefined" || !isStandaloneDisplayMode()) return;
  document.documentElement.classList.add("standalone-pwa");
  const sync = () => syncStandaloneSafeAreaCssVars();
  sync();
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(sync, 100);
  });
}
