/** Geographic buckets for marketplace policy (not UI). */
export type MarketplaceRegion =
  | "europe"
  | "north_america"
  | "central_america"
  | "south_america"
  | "caribbean";

export type MarketplaceCountryRecord = {
  code: string;
  nameAr: string;
  nameEn: string;
  phoneCode: string;
  regions: MarketplaceRegion[];
};

export type MarketplaceCountriesManifest = {
  schemaVersion: number;
  countries: MarketplaceCountryRecord[];
};
