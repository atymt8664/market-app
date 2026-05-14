import { getMarketplaceCities, hasMarketplaceCityDataset } from "./index";

const MAX_LOAD_ATTEMPTS = 3;
const RETRY_BASE_MS = 350;

/** ISO codes with no bundled city list — allow free-text city / area in UI. */
const MANUAL_CITY_ENTRY_CODES = new Set(["MC", "VA", "XK"]);

export type BundledCitiesLoadResult = {
  cities: string[];
  /** True after retries if the bundled JSON could not be loaded or parsed. */
  loadFailed: boolean;
  /** True for MC / VA / XK — UI may offer manual city entry when the list is empty. */
  allowsManualCityEntry: boolean;
};

const successCache = new Map<string, BundledCitiesLoadResult>();

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function normalizeCityName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function dedupeSortCities(names: string[]): string[] {
  return Array.from(
    new Set(
      names.map((n) => normalizeCityName(n)).filter((n) => n.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function allowsManualCityForCountry(countryCode: string): boolean {
  return MANUAL_CITY_ENTRY_CODES.has(countryCode.trim().toUpperCase());
}

/**
 * Loads bundled per-country city JSON with bounded retries (network / chunk / parse).
 * Successful results are cached in-memory for the session. Failed loads are not cached.
 */
export async function loadBundledCitiesWithRetry(
  countryCode: string,
): Promise<BundledCitiesLoadResult> {
  const cc = countryCode.trim().toUpperCase();
  if (!cc) {
    return { cities: [], loadFailed: true, allowsManualCityEntry: false };
  }
  const allowsManual = allowsManualCityForCountry(cc);
  const cached = successCache.get(cc);
  if (cached) return cached;

  if (!hasMarketplaceCityDataset(cc)) {
    return { cities: [], loadFailed: true, allowsManualCityEntry: allowsManual };
  }

  for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt++) {
    try {
      const raw = await getMarketplaceCities(cc);
      if (!Array.isArray(raw)) {
        throw new Error("invalid bundled cities shape");
      }
      const cities = dedupeSortCities(raw.map((x) => String(x)));
      const result: BundledCitiesLoadResult = {
        cities,
        loadFailed: false,
        allowsManualCityEntry: allowsManual,
      };
      successCache.set(cc, result);
      return result;
    } catch {
      if (attempt < MAX_LOAD_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * attempt);
      }
    }
  }

  return { cities: [], loadFailed: true, allowsManualCityEntry: allowsManual };
}
