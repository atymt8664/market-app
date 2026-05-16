import { lookupMarketplaceCountry } from "@/lib/locations/manifest-data";
import { SIGNUP_COUNTRIES } from "@/lib/signup-location-data-constants";

export type MarketplaceCountryOption = {
  code: string;
  nameAr: string;
  nameEn: string;
};

let cachedMarketplaceCountryOptions: MarketplaceCountryOption[] | null = null;

/** Countries available in the home location filter (signup list minus overseas defaults). */
export async function getMarketplaceCountryOptions(): Promise<MarketplaceCountryOption[]> {
  if (cachedMarketplaceCountryOptions) return cachedMarketplaceCountryOptions;
  const excluded = new Set(["US"]);
  const opts = SIGNUP_COUNTRIES.filter((c) => !excluded.has(c.code))
    .map((c) => {
      const row = lookupMarketplaceCountry(c.code);
      return {
        code: c.code,
        nameAr: row?.nameAr ?? c.name,
        nameEn: row?.nameEn ?? c.code,
      };
    })
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
  cachedMarketplaceCountryOptions = opts;
  return opts;
}

export function filterCountriesByQuery(
  countries: MarketplaceCountryOption[],
  query: string,
): MarketplaceCountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return countries;
  return countries.filter(
    (c) =>
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase() === q,
  );
}
