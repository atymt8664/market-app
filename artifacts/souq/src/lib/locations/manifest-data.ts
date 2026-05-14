import type {
  MarketplaceCountriesManifest,
  MarketplaceCountryRecord,
} from "./types";

import manifestJson from "./data/countries.manifest.json";

/** Lightweight manifest access (no city JSON / glob). */
export const marketplaceManifest =
  manifestJson as MarketplaceCountriesManifest;

const manifestByCode = new Map(
  marketplaceManifest.countries.map((c) => [c.code.toUpperCase(), c]),
);

export function lookupMarketplaceCountry(
  countryCode: string,
): MarketplaceCountryRecord | undefined {
  return manifestByCode.get(countryCode.trim().toUpperCase());
}

/** English display name from manifest (no CSC). */
export function resolveCountryName(countryCode: string): string | null {
  const row = manifestByCode.get(countryCode.trim().toUpperCase());
  return row?.nameEn ?? null;
}

/** E.164-style prefix as stored in manifest (e.g. "+49"). */
export function getPhoneCode(countryCode: string): string {
  const row = manifestByCode.get(countryCode.trim().toUpperCase());
  return row?.phoneCode ?? "";
}
