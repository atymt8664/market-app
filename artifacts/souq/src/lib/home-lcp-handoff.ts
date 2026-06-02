/**
 * P7-PR-12 / P9-C: Edge LCP shell lifecycle — dismiss overlay before React featured strip (no DOM handoff).
 */
import { isHomePathname } from "@/lib/p7-home-path";

export const HOME_LCP_MAX_WAIT_MS = 2000;

/** @deprecated P7 featured stability — slot handoff removed; kept for regression guards only. */
export const REACT_LCP_SLOT_ID = "react-lcp-slot";

/** Remove Home-only shell from SPA routes (shared index.html). */
export function stripHomeLcpShell(): void {
  if (typeof document === "undefined") return;
  document.getElementById("p7-lcp-layer")?.remove();
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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    };

    if (img.complete && img.naturalWidth > 0) {
      done();
      return;
    }

    const timeoutId = window.setTimeout(done, HOME_LCP_MAX_WAIT_MS);
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

/** Remove Edge/build LCP overlay — React featured strip owns all card images. */
export function dismissHomeLcpLayer(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("p7-await-handoff");
  document.documentElement.removeAttribute("data-p7-handoff");
  document.getElementById("p7-lcp-layer")?.remove();
}
