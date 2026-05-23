/** Home/Search marketplace location (client-only; no backend in Phase 9 UX). */

export const SEARCH_RADIUS_KM_MIN = 1;
export const SEARCH_RADIUS_KM_MAX = 500;

export const DEFAULT_SEARCH_RADIUS_KM = 1;

/** Legacy picker default before v2 — treated as unapplied storage. */
export const LEGACY_SEARCH_RADIUS_KM = 25;

export const SEARCH_LOCATION_STORAGE_VERSION = 2;

/** Default map center: Germany (marketplace focus). */
export const DEFAULT_SEARCH_MAP_CENTER = {
  lat: 51.1657,
  lng: 10.4515,
} as const;

export type SearchLocationState = {
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
  /** Continuous search radius in kilometres (1–500). */
  radiusKm: number;
  /** When set via GPS without a resolved city name. */
  isCurrentLocation?: boolean;
};

export type SearchLocationPersisted = SearchLocationState & {
  storageVersion?: number;
  /** Set only after user taps Apply in the location picker. */
  appliedByUser?: boolean;
};

function isLegacyUnappliedSearchLocation(o: Record<string, unknown>): boolean {
  const radiusKm = Math.round(Number(o.radiusKm));
  if (radiusKm !== LEGACY_SEARCH_RADIUS_KM) return false;
  if (o.isCurrentLocation === true) return false;
  const city = typeof o.city === "string" ? o.city.trim() : "";
  if (city) return false;
  const countryCode = typeof o.countryCode === "string" ? o.countryCode.trim().toUpperCase() : "";
  const country = typeof o.country === "string" ? o.country.trim() : "";
  if (!country && !countryCode) return true;
  return countryCode === "DE" || country === "Germany" || country === "ألمانيا";
}

/** Radius shown when opening the picker (1 km until user has applied a saved location). */
export function getPickerInitialRadiusKm(
  location: SearchLocationState | null,
): number {
  return location ? clampSearchRadiusKm(location.radiusKm) : DEFAULT_SEARCH_RADIUS_KM;
}

export function toPersistedSearchLocation(
  state: SearchLocationState,
): SearchLocationPersisted {
  return {
    ...state,
    storageVersion: SEARCH_LOCATION_STORAGE_VERSION,
    appliedByUser: true,
  };
}

export function clampSearchRadiusKm(n: number): number {
  const rounded = Math.round(n);
  return Math.max(
    SEARCH_RADIUS_KM_MIN,
    Math.min(SEARCH_RADIUS_KM_MAX, Number.isFinite(rounded) ? rounded : DEFAULT_SEARCH_RADIUS_KM),
  );
}

/** Smart step for +/- controls: fine near user, wider at regional scale. */
export function getSearchRadiusStepKm(radiusKm: number): number {
  const km = clampSearchRadiusKm(radiusKm);
  if (km < 20) return 1;
  if (km < 100) return 5;
  return 10;
}

export function adjustSearchRadiusKm(radiusKm: number, direction: 1 | -1): number {
  const km = clampSearchRadiusKm(radiusKm);
  const step = getSearchRadiusStepKm(km);
  return clampSearchRadiusKm(km + direction * step);
}

export function isValidSearchRadiusKm(n: number): boolean {
  return (
    Number.isFinite(n) &&
    Math.round(n) === n &&
    n >= SEARCH_RADIUS_KM_MIN &&
    n <= SEARCH_RADIUS_KM_MAX
  );
}

/** @deprecated Legacy stepped values — clamp only. */
export function nearestSearchRadiusKm(n: number): number {
  return clampSearchRadiusKm(n);
}

export function parseSearchLocationStored(raw: unknown): SearchLocationState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.storageVersion === SEARCH_LOCATION_STORAGE_VERSION) {
    if (o.appliedByUser !== true) return null;
  } else if (isLegacyUnappliedSearchLocation(o)) {
    return null;
  }

  const lat = Number(o.lat);
  const lng = Number(o.lng);
  const radiusKm = clampSearchRadiusKm(Number(o.radiusKm));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isValidSearchRadiusKm(radiusKm)) return null;
  const country = typeof o.country === "string" ? o.country.trim() : "";
  const countryCode = typeof o.countryCode === "string" ? o.countryCode.trim() : "";
  const city = typeof o.city === "string" ? o.city.trim() : "";
  if (!country && !city && !o.isCurrentLocation) return null;
  return {
    country,
    countryCode,
    city,
    lat,
    lng,
    radiusKm,
    isCurrentLocation: o.isCurrentLocation === true,
  };
}

/** One-time read: migrate search_location_v1 → v2 in localStorage. */
export function migrateSearchLocationStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const v2Key = "search_location_v2";
    if (window.localStorage.getItem(v2Key) != null) return;
    const v1Raw = window.localStorage.getItem("search_location_v1");
    if (!v1Raw) return;
    const parsed = JSON.parse(v1Raw) as unknown;
    const loc = parseSearchLocationStored(parsed);
    window.localStorage.removeItem("search_location_v1");
    if (loc) {
      window.localStorage.setItem(v2Key, JSON.stringify(toPersistedSearchLocation(loc)));
    }
  } catch {
    /* ignore corrupt storage */
  }
}

export type GeolocationContextIssue = "insecure" | "unsupported";

/** Whether `navigator.geolocation` can work in this browsing context. */
export function getGeolocationContextIssue(): GeolocationContextIssue | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "unsupported";
  }
  if (!navigator.geolocation) return "unsupported";
  if (window.isSecureContext) return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return null;
  }
  return "insecure";
}

/**
 * City filter for homepage recommended grid.
 * When search location is active, only its city counts — never a stale selected_city
 * (country-only apply used to keep Berlin/Germany in selected_city and empty the feed).
 */
export function searchLocationCityForFeed(
  selectedCity: string,
  searchLocation: SearchLocationState | null,
): string {
  if (searchLocation) {
    return searchLocation.city.trim();
  }
  return selectedCity.trim();
}

/** Compact label for search bar, e.g. "برلين (+1 كم)". */
export function formatSearchLocationBarLabel(
  loc: SearchLocationState | null,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!loc) return null;
  const place = loc.isCurrentLocation
    ? t("search_location.current_place")
    : loc.city || loc.country;
  if (!place) return null;
  return t("search_location.bar_label", { place, radius: loc.radiusKm });
}
