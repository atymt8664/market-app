/** Low-cardinality route label for CWV RUM (matches API observability normalization). */
export function normalizeVitalsRoute(pathname: string): string {
  let path = pathname.split("?")[0] || "/";
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  if (base && base !== "/" && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  return path
    .replace(/\/\d+/g, "/:id")
    .replace(/\/[0-9a-f-]{36}/gi, "/:uuid");
}
