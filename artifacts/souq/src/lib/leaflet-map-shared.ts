/** Shared Leaflet basemap + icon setup (search + ad detail). */
export const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const NOMINATIM_USER_AGENT =
  "SouqArabEU/1.0 (city geocoding; contact: support@souqarabeu.com)";

/** Tailwind classes for embedded Leaflet maps inside dark app chrome. */
export function leafletMapShellClass(className?: string): string {
  return [
    className,
    "relative overflow-hidden",
    "[&_.leaflet-container]:!h-full [&_.leaflet-container]:!w-full [&_.leaflet-container]:!bg-[#e8ecf1]",
    "[&_.leaflet-control-zoom]:!hidden",
    "[&_.leaflet-control-attribution]:!bottom-1 [&_.leaflet-control-attribution]:!end-1 [&_.leaflet-control-attribution]:!start-auto [&_.leaflet-control-attribution]:!z-[400] [&_.leaflet-control-attribution]:!max-w-[55%] [&_.leaflet-control-attribution]:!rounded-md [&_.leaflet-control-attribution]:!bg-black/55 [&_.leaflet-control-attribution]:!px-1.5 [&_.leaflet-control-attribution]:!py-0.5 [&_.leaflet-control-attribution]:!text-[9px] [&_.leaflet-control-attribution]:!leading-tight [&_.leaflet-control-attribution]:!text-white/80",
  ]
    .filter(Boolean)
    .join(" ");
}
