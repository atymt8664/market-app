import { SIGNUP_COUNTRY_BY_CODE } from "@/lib/signup-location-data-constants";
import {
  allowsManualCityForCountry,
  loadBundledCitiesWithRetry,
} from "@/lib/locations/cities-loader";

export type { SignupCountry } from "@/lib/signup-location-data-constants";
export {
  SIGNUP_COUNTRIES,
  SIGNUP_COUNTRY_BY_CODE,
  countryCodeToFlagEmoji,
} from "@/lib/signup-location-data-constants";

export { allowsManualCityForCountry, loadBundledCitiesWithRetry } from "@/lib/locations/cities-loader";

/**
 * Sorted unique city names from bundled JSON (with retries on transient failure).
 * Runtime does not use `country-state-city`.
 */
export async function loadCitiesForCountry(countryCode: string): Promise<string[]> {
  if (!countryCode) return [];
  const r = await loadBundledCitiesWithRetry(countryCode);
  return r.cities;
}

/** Phone codes are fully covered by `SIGNUP_COUNTRIES`; city lists use bundled JSON only. */
export function getPhoneCodeFromCountry(countryCode: string): string {
  return SIGNUP_COUNTRY_BY_CODE[countryCode]?.phoneCode ?? "";
}
