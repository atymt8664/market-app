/**
 * P7-PR-12 / P7-PR-14: LCP shell handoff — move same #p7-lcp-candidate node (no supersession).
 */
export const REACT_LCP_SLOT_ID = "react-lcp-slot";

let handoffComplete = false;
const listeners = new Set<() => void>();

export function isHomeLcpHandoffComplete(): boolean {
  return handoffComplete;
}

export function subscribeHomeLcpHandoff(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Mark React phase: block #root imgs from painting until DOM handoff. */
export function beginHomeLcpHandoffAwait(): void {
  if (typeof document === "undefined") return;
  if (!document.getElementById("p7-lcp-layer")) return;
  handoffComplete = false;
  document.documentElement.classList.add("p7-await-handoff");
}

/**
 * Move shell LCP <img> into React lead card — same element, Lighthouse keeps early LCP.
 * Returns true when the shell img was handed off.
 */
export function handoffShellLcpToReact(slotId = REACT_LCP_SLOT_ID): boolean {
  if (typeof document === "undefined") return false;
  const img = document.getElementById("p7-lcp-candidate");
  const slot = document.getElementById(slotId);
  if (!img || !slot) return false;

  handoffComplete = true;
  document.documentElement.classList.remove("p7-await-handoff");
  document.documentElement.setAttribute("data-p7-handoff", "1");

  img.className = "absolute inset-0 h-full w-full object-cover";
  img.removeAttribute("tabindex");
  slot.appendChild(img);

  const layer = document.getElementById("p7-lcp-layer");
  if (layer) layer.remove();

  listeners.forEach((fn) => fn());
  return true;
}

/** Fallback when lead slot is not mounted (non-Home paths). */
export function dismissHomeLcpLayer(): void {
  if (typeof document === "undefined") return;
  if (handoffShellLcpToReact()) return;
  const layer = document.getElementById("p7-lcp-layer");
  if (!layer) return;
  handoffComplete = true;
  document.documentElement.classList.remove("p7-await-handoff");
  document.documentElement.setAttribute("data-p7-handoff", "1");
  layer.remove();
  listeners.forEach((fn) => fn());
}
