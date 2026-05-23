/**
 * Approximate city centers for ad-detail map (privacy: no street-level GPS).
 *
 * Phase 1 (current): Germany marketplace cities only — safe interim, no GPS.
 * Phase 2 (planned): country-aware `resolveAdCityCenter(city, countryCode)` using
 * marketplace location manifest (EU / US / CA, etc.) — no hardcoded "Germany" in UI URLs.
 */
export type GermanCityCenter = { lat: number; lng: number };

export const GERMAN_CITY_CENTERS: Record<string, GermanCityCenter> = {
  "Berlin": { lat: 52.51739, lng: 13.39513 },
  "Hamburg": { lat: 53.55017, lng: 10.00132 },
  "München": { lat: 48.13711, lng: 11.57538 },
  "Köln": { lat: 50.93836, lng: 6.95997 },
  "Frankfurt am Main": { lat: 50.11064, lng: 8.68209 },
  "Stuttgart": { lat: 48.77845, lng: 9.18001 },
  "Düsseldorf": { lat: 51.2254, lng: 6.77631 },
  "Leipzig": { lat: 51.34063, lng: 12.37473 },
  "Dortmund": { lat: 51.51423, lng: 7.46528 },
  "Essen": { lat: 51.45822, lng: 7.01582 },
  "Bremen": { lat: 53.07582, lng: 8.80716 },
  "Dresden": { lat: 51.04933, lng: 13.73814 },
  "Hannover": { lat: 52.37448, lng: 9.73855 },
  "Nürnberg": { lat: 49.45387, lng: 11.0773 },
  "Duisburg": { lat: 51.435, lng: 6.75956 },
  "Bochum": { lat: 51.48181, lng: 7.21966 },
  "Wuppertal": { lat: 51.26402, lng: 7.17804 },
  "Bielefeld": { lat: 52.0191, lng: 8.53101 },
  "Bonn": { lat: 50.73526, lng: 7.10246 },
  "Münster": { lat: 51.96251, lng: 7.62519 },
  "Karlsruhe": { lat: 49.00687, lng: 8.40342 },
  "Mannheim": { lat: 49.48929, lng: 8.46731 },
  "Augsburg": { lat: 48.36903, lng: 10.89795 },
  "Wiesbaden": { lat: 50.08204, lng: 8.24166 },
  "Mönchengladbach": { lat: 51.19471, lng: 6.43538 },
  "Gelsenkirchen": { lat: 51.51103, lng: 7.09601 },
  "Braunschweig": { lat: 52.26466, lng: 10.52361 },
  "Kiel": { lat: 54.32271, lng: 10.13556 },
  "Chemnitz": { lat: 50.83235, lng: 12.91891 },
  "Aachen": { lat: 50.77635, lng: 6.08386 },
  "Halle": { lat: 51.48244, lng: 11.9713 },
  "Magdeburg": { lat: 52.13148, lng: 11.64008 },
  "Freiburg im Breisgau": { lat: 47.99609, lng: 7.8494 },
  "Krefeld": { lat: 51.33312, lng: 6.56233 },
  "Lübeck": { lat: 53.86644, lng: 10.68474 },
  "Mainz": { lat: 49.99952, lng: 8.27363 },
  "Erfurt": { lat: 50.9778, lng: 11.02874 },
  "Oberhausen": { lat: 51.46961, lng: 6.85144 },
  "Rostock": { lat: 54.08867, lng: 12.14002 },
  "Kassel": { lat: 51.31578, lng: 9.49785 },
  "Hagen": { lat: 51.35829, lng: 7.4733 },
  "Saarbrücken": { lat: 49.23436, lng: 6.99638 },
  "Hamm": { lat: 50.01652, lng: 6.41846 },
  "Potsdam": { lat: 52.40093, lng: 13.05914 },
  "Mülheim an der Ruhr": { lat: 51.42729, lng: 6.88292 },
  "Ludwigshafen": { lat: 49.47041, lng: 8.43816 },
  "Oldenburg": { lat: 53.13898, lng: 8.2146 },
  "Leverkusen": { lat: 51.03247, lng: 6.98812 },
  "Osnabrück": { lat: 52.27196, lng: 8.04763 },
  "Solingen": { lat: 51.17216, lng: 7.08459 },
  "Heidelberg": { lat: 49.40936, lng: 8.69472 },
  "Herne": { lat: 51.53804, lng: 7.21999 },
  "Neuss": { lat: 51.19818, lng: 6.69165 },
  "Darmstadt": { lat: 49.87277, lng: 8.65118 },
  "Paderborn": { lat: 51.7177, lng: 8.75265 },
  "Regensburg": { lat: 49.01953, lng: 12.09749 },
  "Ingolstadt": { lat: 48.76302, lng: 11.42504 },
  "Würzburg": { lat: 49.77804, lng: 9.94348 },
  "Fürth": { lat: 49.48857, lng: 10.95872 },
  "Wolfsburg": { lat: 52.42056, lng: 10.78617 },
  "Offenbach am Main": { lat: 50.1055, lng: 8.76107 },
  "Ulm": { lat: 48.3985, lng: 9.99125 },
  "Heilbronn": { lat: 49.14229, lng: 9.21866 },
  "Pforzheim": { lat: 48.89093, lng: 8.70255 },
  "Göttingen": { lat: 51.53283, lng: 9.93518 },
  "Bottrop": { lat: 51.52158, lng: 6.9292 },
  "Trier": { lat: 49.75962, lng: 6.64419 },
  "Recklinghausen": { lat: 51.61438, lng: 7.19785 },
  "Reutlingen": { lat: 48.49195, lng: 9.21141 },
  "Bremerhaven": { lat: 53.55054, lng: 8.58519 },
  "Koblenz": { lat: 50.35333, lng: 7.5944 },
  "Bergisch Gladbach": { lat: 50.99293, lng: 7.12774 },
  "Jena": { lat: 50.92817, lng: 11.58794 },
  "Remscheid": { lat: 51.17987, lng: 7.19435 },
  "Erlangen": { lat: 49.58916, lng: 10.98121 },
  "Moers": { lat: 51.45128, lng: 6.62843 },
  "Siegen": { lat: 50.87512, lng: 8.02561 },
  "Hildesheim": { lat: 52.15272, lng: 9.95181 },
  "Salzgitter": { lat: 52.15037, lng: 10.35931 },
  "Cottbus": { lat: 51.75674, lng: 14.33573 },
  "Kaiserslautern": { lat: 49.44322, lng: 7.769 },
};

const centerByLower = new Map<string, GermanCityCenter>(
  Object.entries(GERMAN_CITY_CENTERS).map(([name, center]) => [
    name.trim().toLowerCase(),
    center,
  ]),
);

/** Resolve marketplace city name to approximate center (Germany only). */
export function resolveGermanCityCenter(cityName: string): GermanCityCenter | null {
  const key = cityName.trim().toLowerCase();
  if (!key) return null;
  return centerByLower.get(key) ?? null;
}

/** Opens Google Maps at approximate city center (lat/lng) when known — no user GPS. */
export function buildCityMapsSearchUrl(
  cityName: string,
  center?: GermanCityCenter | null,
): string {
  if (center) {
    const q = encodeURIComponent(`${center.lat},${center.lng}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  const query = encodeURIComponent(`${cityName.trim()}, Germany`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Static map image (OSM.de) — city-level zoom, no API key. */
export function buildCityStaticMapUrl(
  center: GermanCityCenter,
  width = 640,
  height = 280,
): string {
  const lat = center.lat.toFixed(5);
  const lng = center.lng.toFixed(5);
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "11",
    size: `${width}x${height}`,
    markers: `${lat},${lng},lightgreen1`,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}
