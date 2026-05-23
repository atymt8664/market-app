/**
 * Circle + zoom scale for search location map (1–500 km).
 * Targets a growing viewport fraction so 300/500 km stay visually distinct (no fitBounds).
 */

const EARTH_CIRCUMFERENCE_M = 40075016.686;
const TILE_SIZE = 256;

export const SEARCH_LOCATION_ZOOM_MIN = 3;
export const SEARCH_LOCATION_ZOOM_MAX = 17;
export const SEARCH_LOCATION_ZOOM_SNAP = 0.05;

const REF_MAP_PX = 340;

function clampRadiusKm(radiusKm: number): number {
  return Math.max(1, Math.min(500, radiusKm));
}

function snapZoom(zoom: number): number {
  const snap = SEARCH_LOCATION_ZOOM_SNAP;
  const snapped = Math.round(zoom / snap) * snap;
  return Math.max(
    SEARCH_LOCATION_ZOOM_MIN,
    Math.min(SEARCH_LOCATION_ZOOM_MAX, snapped),
  );
}

/** Circle diameter as share of map card — strong growth 100→300→500 km. */
export function targetCircleViewportFraction(radiusKm: number): number {
  const km = clampRadiusKm(radiusKm);
  const t = Math.log(km) / Math.log(500);
  const raw = 0.1 + t * 0.35 + t * t * 0.35;
  return Math.min(0.78, raw);
}

/**
 * Zoom so geodesic circle diameter matches target fraction of the map card.
 */
export function getSearchLocationMapZoom(
  radiusKm: number,
  lat: number,
  mapPx = REF_MAP_PX,
): number {
  const km = clampRadiusKm(radiusKm);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const scaleAtZoom0 = EARTH_CIRCUMFERENCE_M * cosLat;

  const fraction = targetCircleViewportFraction(km);
  const cardPx = Math.max(200, mapPx);
  const targetDiameterPx = cardPx * fraction;
  const diameterM = km * 2 * 1000;
  const metersPerPixel = diameterM / targetDiameterPx;
  const rawZoom = Math.log2(scaleAtZoom0 / (TILE_SIZE * metersPerPixel));

  return snapZoom(rawZoom);
}

/** Pixel diameter of geodesic circle at zoom (for tests). */
export function circleDiameterPxAtZoom(
  radiusKm: number,
  lat: number,
  zoom: number,
): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_M * cosLat) / (TILE_SIZE * Math.pow(2, zoom));
  return (radiusKm * 2 * 1000) / metersPerPixel;
}
