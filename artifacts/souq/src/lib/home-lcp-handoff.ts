/**
 * P7-PR-12 / P9-C: Edge LCP shell lifecycle — dismiss overlay before React featured strip (no DOM handoff).
 */
import { getHomeShellLcpBootWaitMs } from "@/lib/home-cold-start";
import { isHomePathname } from "@/lib/p7-home-path";

/** P9-E-3 Fix C: restore pre-P9-E safety margin for shell img under throttling. */
export const HOME_LCP_MAX_WAIT_MS = 2000;

/** @deprecated P7 featured stability — slot handoff removed; kept for regression guards only. */
export const REACT_LCP_SLOT_ID = "react-lcp-slot";

/** Remove Home-only shell from SPA routes (shared index.html). */
export function stripHomeLcpShell(): void {
  if (typeof document === "undefined") return;
  document.getElementById("p7-header-shell")?.remove();
  document.getElementById("p7-lcp-layer")?.remove();
  document.getElementById("p7-bottom-nav-shell")?.remove();
  document.getElementById("p7-bottom-nav-shell-mount")?.remove();
  document.getElementById("p7-lcp-hero-preload")?.remove();
  document.documentElement.classList.remove("p7-await-handoff", "p7-lcp-stable");
  document.documentElement.removeAttribute("data-p7-lcp-stable");
  document.documentElement.removeAttribute("data-p7-handoff");
}

export function stripHomeLcpShellIfNotHome(): void {
  if (!isHomePathname()) stripHomeLcpShell();
}

/** Wait for shell LCP candidate img (or timeout) — single source for lcp-loader boot. */
export function waitForHomeShellLcp(): Promise<void> {
  return new Promise((resolve) => {
    const layer = document.getElementById("p7-lcp-layer");
    if (!layer) {
      resolve();
      return;
    }

    const img = document.getElementById("p7-lcp-candidate") as HTMLImageElement | null;
    if (!img) {
      resolve();
      return;
    }

    const done = () => {
      document.documentElement.classList.add("p7-lcp-stable");
      document.documentElement.setAttribute("data-p7-lcp-stable", "1");
      /** Single rAF — shell img painted; defer second frame (P9-E cold-path trim). */
      requestAnimationFrame(() => resolve());
    };

    if (img.complete && img.naturalWidth > 0) {
      done();
      return;
    }

    const timeoutId = window.setTimeout(done, getHomeShellLcpBootWaitMs());
    const finish = () => {
      window.clearTimeout(timeoutId);
      done();
    };
    img.addEventListener("load", finish, { once: true });
    img.addEventListener("error", finish, { once: true });
  });
}

/** @deprecated Featured stability — do not hide #root images; shell is dismissed before React featured. */
export function beginHomeLcpHandoffAwait(): void {
  /* no-op */
}

/** @deprecated DOM handoff removed — use dismissHomeLcpLayer when React featured is ready. */
export function handoffShellLcpToReact(_slotId = REACT_LCP_SLOT_ID): boolean {
  return false;
}

/** True when build/Edge injected the static header shell. */
export function isHomeHeaderShellActive(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.getElementById("p7-header-shell")?.querySelector('[data-p7-header-shell="1"]');
}

/** Remove static header shell once React header has painted (P9-E-FIX-A). */
export function dismissHomeHeaderShell(): void {
  if (typeof document === "undefined") return;
  document.getElementById("p7-header-shell")?.remove();
}

/** True when build/Edge injected the neutral feed skeleton (not empty dev placeholder). */
export function isHomeLcpFeedShellActive(): boolean {
  if (typeof document === "undefined") return false;
  return !!document
    .getElementById("p7-lcp-layer")
    ?.querySelector('[data-p7-feed-shell="1"]');
}

/** P9-3B: keep Edge feed shell below header — sync with React fixed header height. */
export function syncHomeFeedShellOffset(headerPx: number): void {
  if (typeof document === "undefined") return;
  const h = Math.max(0, Math.round(headerPx));
  document.documentElement.style.setProperty("--p7-home-header-offset", `${h}px`);
  document.documentElement.style.setProperty("--p7-home-feed-offset", `${h}px`);
}

/** P9-3C: measure static header shell before React boot — correct feed offset from Frame 1. */
export function syncHomeFeedShellOffsetFromStaticHeader(): void {
  if (typeof document === "undefined") return;
  const shell = document.querySelector<HTMLElement>('#p7-header-shell [data-p7-header-shell="1"]');
  if (!shell) return;
  const h = shell.getBoundingClientRect().height;
  if (h > 0) syncHomeFeedShellOffset(h);
}

/** True when build/Edge injected the static bottom nav shell. */
export function isHomeBottomNavShellActive(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.getElementById("p7-bottom-nav-shell")?.querySelector('[data-p7-bottom-nav-shell="1"]');
}

/** Remove static bottom nav shell once React BottomNav has painted (P9-3C). */
export function dismissHomeBottomNavShell(): void {
  if (typeof document === "undefined") return;
  document.getElementById("p7-bottom-nav-shell")?.remove();
  document.getElementById("p7-bottom-nav-shell-mount")?.remove();
}

/** Remove Edge/build LCP overlay — React featured strip owns all card images. */
export function dismissHomeLcpLayer(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("p7-await-handoff");
  document.documentElement.removeAttribute("data-p7-handoff");
  document.getElementById("p7-lcp-layer")?.remove();
}
