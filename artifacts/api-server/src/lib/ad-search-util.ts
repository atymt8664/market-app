/** Pure search helpers (no DB) — unit-testable. */

export const AD_SEARCH_MIN_LEN = 1;
export const AD_SEARCH_MAX_LEN = 100;

/** Normalize user search text for FTS / ILIKE fallback. */
export function normalizeSearchQuery(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const q = String(raw).trim().replace(/\s+/g, " ");
  if (q.length < AD_SEARCH_MIN_LEN) return null;
  if (q.length > AD_SEARCH_MAX_LEN) return q.slice(0, AD_SEARCH_MAX_LEN);
  return q;
}

export function normalizeCityFilter(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const c = String(raw).trim().replace(/\s+/g, " ");
  if (!c) return null;
  if (c.length > 120) return c.slice(0, 120);
  return c;
}
