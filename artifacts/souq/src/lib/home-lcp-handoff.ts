/**
 * P7-PR-12: Edge LCP shell lifecycle — dismiss overlay before React featured strip (no DOM handoff).
 */
import { isHomePathname } from "@/lib/p7-home-path";

/** @deprecated P7 featured stability — slot handoff removed; kept for tests/docs only. */
export const REACT_LCP_SLOT_ID = "react-lcp-slot";

/** Remove Home-only shell from SPA routes (shared index.html). */
export function stripHomeLcpShell(): void {
  if (typeof document === "undefined") return;
  document.getElementById("p7-lcp-layer")?.remove();
  document.getElementById("p7-lcp-hero-preload")?.remove();
  document.documentElement.classList.remove("p7-await-handoff", "p7-lcp-stable");
  document.documentElement.removeAttribute("data-p7-lcp-stable");
  document.documentElement.removeAttribute("data-p7-handoff");
  handoffComplete = true;
  listeners.forEach((fn) => fn());
}

export function stripHomeLcpShellIfNotHome(): void {
  if (!isHomePathname()) stripHomeLcpShell();
}

let handoffComplete = false;
const listeners = new Set<() => void>();

export function isHomeLcpHandoffComplete(): boolean {
  return handoffComplete;
}

export function subscribeHomeLcpHandoff(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
  handoffComplete = true;
  document.documentElement.classList.remove("p7-await-handoff");
  document.documentElement.removeAttribute("data-p7-handoff");
  document.getElementById("p7-lcp-layer")?.remove();
  listeners.forEach((fn) => fn());
}
