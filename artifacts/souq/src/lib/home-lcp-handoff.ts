/**
 * P7-PR-12: remove progressive LCP layer after React Home has featured content (no visual clash).
 */
export function dismissHomeLcpLayer(): void {
  if (typeof document === "undefined") return;
  const layer = document.getElementById("p7-lcp-layer");
  if (!layer) return;
  layer.classList.add("p7-dismissed");
  layer.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    layer.remove();
  }, 220);
}
