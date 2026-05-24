/**
 * Process-local TTL cache for public taxonomy reads (P9).
 * Avoids repeated GROUP BY on hot paths (/api/categories, subcategories).
 * Not Redis — single-process only; safe until P16 multi-instance adapter.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Aligns with frontend STALE_CATEGORIES_MS (10m) — API TTL shorter for adCount freshness. */
export const TAXONOMY_PUBLIC_CACHE_MS = envInt("TAXONOMY_PUBLIC_CACHE_MS", 120_000);

/** Browser/CDN hint for anonymous taxonomy GETs (nginx may also gzip). */
export const TAXONOMY_PUBLIC_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=120";

type CacheSlot<T> = { value: T; expiresAt: number };

let categoriesSlot: CacheSlot<unknown> | null = null;
const subcategoriesByCategoryId = new Map<number, CacheSlot<unknown>>();

function isFresh<T>(slot: CacheSlot<T> | null | undefined): slot is CacheSlot<T> {
  return slot != null && Date.now() < slot.expiresAt;
}

export function getCachedCategories<T>(): T | null {
  return isFresh(categoriesSlot) ? (categoriesSlot.value as T) : null;
}

export function setCachedCategories<T>(value: T): void {
  categoriesSlot = { value, expiresAt: Date.now() + TAXONOMY_PUBLIC_CACHE_MS };
}

export function getCachedSubcategories<T>(categoryId: number): T | null {
  const slot = subcategoriesByCategoryId.get(categoryId);
  return isFresh(slot) ? (slot.value as T) : null;
}

export function setCachedSubcategories<T>(categoryId: number, value: T): void {
  subcategoriesByCategoryId.set(categoryId, {
    value,
    expiresAt: Date.now() + TAXONOMY_PUBLIC_CACHE_MS,
  });
}

/** Call after admin taxonomy mutations so public reads reflect changes immediately. */
export function invalidateTaxonomyPublicCache(): void {
  categoriesSlot = null;
  subcategoriesByCategoryId.clear();
}
