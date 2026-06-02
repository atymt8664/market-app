/**
 * P7-PR-12 / P7-PR-14: LCP shell handoff — suppress React image paints until layer dismisses.
 */
let handoffComplete = false;
const listeners = new Set<() => void>();

export function isHomeLcpHandoffComplete(): boolean {
  return handoffComplete;
}

export function subscribeHomeLcpHandoff(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Remove progressive LCP layer after React Home is ready to show featured (post-LCP-stable). */
export function dismissHomeLcpLayer(): void {
  if (typeof document === "undefined") return;
  const layer = document.getElementById("p7-lcp-layer");
  if (!layer) return;
  handoffComplete = true;
  document.documentElement.classList.remove("p7-await-handoff");
  document.documentElement.setAttribute("data-p7-handoff", "1");
  layer.classList.add("p7-dismissed");
  layer.setAttribute("aria-hidden", "true");
  listeners.forEach((fn) => fn());
  window.setTimeout(() => {
    layer.remove();
  }, 220);
}

/** Mark React phase: block #root images from becoming LCP until handoff. */
export function beginHomeLcpHandoffAwait(): void {
  if (typeof document === "undefined") return;
  if (!document.getElementById("p7-lcp-layer")) return;
  handoffComplete = false;
  document.documentElement.classList.add("p7-await-handoff");
}
