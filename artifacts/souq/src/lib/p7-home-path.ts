/** P7-PR-12 regression guard: Home LCP shell applies only to `/`. */
export function isHomePathname(pathname = typeof window !== "undefined" ? window.location.pathname : "/"): boolean {
  const base = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
  const stripped =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
  return stripped === "/" || stripped === "";
}
