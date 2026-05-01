import { Country } from "country-state-city";
import { SIGNUP_COUNTRIES } from "@/lib/signup-location-data";

export type MarketplaceCountryOption = {
  code: string;
  nameAr: string;
  nameEn: string;
};

/** Countries available in the home location filter (signup list minus overseas defaults). */
export function getMarketplaceCountryOptions(): MarketplaceCountryOption[] {
  const excluded = new Set(["US", "CA"]);
  return SIGNUP_COUNTRIES.filter((c) => !excluded.has(c.code))
    .map((c) => ({
      code: c.code,
      nameAr: c.name,
      nameEn:
        Country.getCountryByCode(c.code)?.name ??
        Country.getCountryByCode(c.code.toUpperCase())?.name ??
        c.code,
    }))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
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
