/**
 * Resolve ad listing city → map center (lat/lng).
 * Uses stored coordinates when present; otherwise bundled DE centers or one-shot Nominatim + cache.
 */
import { resolveCountryName } from "@/lib/locations/manifest-data";
import { resolveGermanCityCenter } from "@/lib/german-city-centers";
import { NOMINATIM_USER_AGENT } from "@/lib/leaflet-map-shared";

export type AdCityCenter = {
  lat: number;
  lng: number;
  source: "coordinates" | "bundled" | "cache" | "geocode";
};

export type ResolveAdCityCenterInput = {
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
};

const CACHE_PREFIX = "souq:city-center:v1:";
const memoryCache = new Map<string, AdCityCenter>();

function cacheKey(city: string, countryCode?: string | null): string {
  const c = city.trim().toLowerCase();
  const cc = (countryCode ?? "").trim().toUpperCase();
  return `${cc}|${c}`;
}

function readPersistentCache(key: string): AdCityCenter | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng)
    ) {
      return { lat: parsed.lat, lng: parsed.lng, source: "cache" };
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

function writePersistentCache(key: string, center: AdCityCenter): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ lat: center.lat, lng: center.lng }),
    );
  } catch {
    /* quota / private mode */
  }
}

function parseCoordinates(
  latitude?: number | null,
  longitude?: number | null,
): AdCityCenter | null {
  if (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { lat: latitude, lng: longitude, source: "coordinates" };
  }
  return null;
}

async function geocodeCityOnce(
  city: string,
  countryCode?: string | null,
): Promise<AdCityCenter | null> {
  const cc = countryCode?.trim().toUpperCase() ?? "";
  const countryName = cc ? resolveCountryName(cc) : null;
  const query = countryName
    ? `${city.trim()}, ${countryName}`
    : city.trim();
  if (query.length < 2) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  if (cc) url.searchParams.set("countrycodes", cc.toLowerCase());

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": NOMINATIM_USER_AGENT,
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const hit = data[0];
  if (!hit) return null;

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, source: "geocode" };
}

/** Resolve map center for an ad listing (async — may geocode once). */
export async function resolveAdCityCenter(
  input: ResolveAdCityCenterInput,
): Promise<AdCityCenter | null> {
  const cityTrim = input.city.trim();
  if (!cityTrim) return null;

  const fromCoords = parseCoordinates(input.latitude, input.longitude);
  if (fromCoords) return fromCoords;

  const key = cacheKey(cityTrim, input.countryCode);
  const mem = memoryCache.get(key);
  if (mem) return mem;

  const persisted = readPersistentCache(key);
  if (persisted) {
    memoryCache.set(key, persisted);
    return persisted;
  }

  const bundled = resolveGermanCityCenter(cityTrim);
  if (bundled) {
    const center: AdCityCenter = {
      lat: bundled.lat,
      lng: bundled.lng,
      source: "bundled",
    };
    memoryCache.set(key, center);
    writePersistentCache(key, center);
    return center;
  }

  const geocoded = await geocodeCityOnce(cityTrim, input.countryCode);
  if (geocoded) {
    memoryCache.set(key, geocoded);
    writePersistentCache(key, geocoded);
  }
  return geocoded;
}
