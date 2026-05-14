/**
 * Marketplace locations (Souq Arab EU) — bundled manifest + per-country city JSON.
 *
 * Call sites load cities via `@/lib/locations/cities-loader` (retries + manual-entry flags).
 */
import type { MarketplaceCountryRecord } from "./types";

import { marketplaceManifest } from "./manifest-data";

export { getPhoneCode, resolveCountryName } from "./manifest-data";

const cityListCache = new Map<string, string[]>();

const cityModules = import.meta.glob("./data/cities/*.json", {
  import: "default",
}) as Record<string, () => Promise<string[]>>;

function cityModulePath(code: string): string {
  return `./data/cities/${code.toUpperCase()}.json`;
}

/** True if a bundled per-country city JSON exists for this ISO code. */
export function hasMarketplaceCityDataset(countryCode: string): boolean {
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return false;
  return cityModulePath(cc) in cityModules;
}

/** Countries offered by the marketplace dataset (EU focus + Americas coverage). */
export async function getMarketplaceCountries(): Promise<
  MarketplaceCountryRecord[]
> {
  return [...marketplaceManifest.countries].sort((a, b) =>
    a.nameAr.localeCompare(b.nameAr, "ar"),
  );
}

/** Sorted unique city names for a country code; empty if unknown / no data file. */
export async function getMarketplaceCities(
  countryCode: string,
): Promise<string[]> {
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return [];
  const hit = cityListCache.get(cc);
  if (hit) return hit;

  const loader = cityModules[cityModulePath(cc)];
  if (!loader) {
    cityListCache.set(cc, []);
    return [];
  }
  const list = await loader();
  cityListCache.set(cc, list);
  return list;
}

export type { MarketplaceCountryRecord, MarketplaceRegion } from "./types";
