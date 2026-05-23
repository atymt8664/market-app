import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getSearchLocationMapZoom,
  SEARCH_LOCATION_ZOOM_SNAP,
} from "@/lib/search-location-map-zoom";

/** Fix default marker icons in Vite bundles. */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png?url";
import markerIcon from "leaflet/dist/images/marker-icon.png?url";
import markerShadow from "leaflet/dist/images/marker-shadow.png?url";

// @ts-expect-error Leaflet internal icon path hack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Map tiles (free Carto/OSM, no API key).
 *
 * Previous stack (dark_matter + dark_only_labels) looked black on real phones:
 * - both layers are low-luminance “dark theme” → roads/cities vanish outdoors
 * - CSS filter on .leaflet-tile-pane breaks tile compositing on iOS Safari
 * - #0A0A0A container shows through while tiles load → “black screen”
 *
 * Kleinanzeigen-style readability: neutral high-contrast base + bright label overlay
 * (same pattern as classified apps: light/detail map inside dark app chrome).
 */
/** Single high-contrast basemap (cities/roads/borders built-in — Kleinanzeigen-class readability). */
const MAP_TILE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const MIN_MAP_PX = 80;

function mapHasUsableSize(map: L.Map): boolean {
  const s = map.getSize();
  return s.x >= MIN_MAP_PX && s.y >= MIN_MAP_PX;
}

/** Center + continuous log zoom (no fitBounds). */
export function applySearchLocationMapView(
  map: L.Map,
  center: L.LatLngExpression,
  radiusKm: number,
  latForZoom: number,
  animate = true,
): void {
  if (!mapHasUsableSize(map)) return;
  try {
    const cardPx = Math.max(MIN_MAP_PX, Math.min(map.getSize().x, map.getSize().y));
    const zoom = getSearchLocationMapZoom(radiusKm, latForZoom, cardPx);
    const container = map.getContainer();
    container.dataset.searchZoom = String(zoom);
    container.dataset.searchRadiusKm = String(radiusKm);
    map.setView(center, zoom, {
      animate,
      duration: animate ? 0.14 : 0,
    });
  } catch {
    /* map not ready during sheet animation */
  }
}

function safeApplyView(
  map: L.Map,
  center: L.LatLngExpression,
  radiusKm: number,
  latForZoom: number,
): void {
  if (!mapHasUsableSize(map)) return;
  try {
    map.invalidateSize({ animate: false });
    applySearchLocationMapView(map, center, radiusKm, latForZoom);
  } catch {
    /* ignore transient leaflet errors while sheet opens */
  }
}

export type SearchLocationMapProps = {
  lat: number;
  lng: number;
  radiusKm: number;
  onCenterChange: (lat: number, lng: number) => void;
  sheetOpen?: boolean;
  className?: string;
};

export function SearchLocationMap({
  lat,
  lng,
  radiusKm,
  onCenterChange,
  sheetOpen = true,
  className,
}: SearchLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const skipViewRef = useRef(false);
  const viewRafRef = useRef<number | null>(null);
  const initGenRef = useRef(0);
  onCenterChangeRef.current = onCenterChange;

  useEffect(() => {
    if (!sheetOpen) return;
    const el = containerRef.current;
    if (!el) return;

    const gen = ++initGenRef.current;
    let cancelled = false;
    let lateViewTimer: ReturnType<typeof setTimeout> | null = null;

    const initWhenSized = () => {
      if (cancelled || gen !== initGenRef.current || mapRef.current) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < MIN_MAP_PX || height < MIN_MAP_PX) {
        requestAnimationFrame(initWhenSized);
        return;
      }

      const map = L.map(el, {
        center: [lat, lng],
        zoom: getSearchLocationMapZoom(radiusKm, lat, Math.max(width, height)),
        zoomSnap: SEARCH_LOCATION_ZOOM_SNAP,
        zoomDelta: SEARCH_LOCATION_ZOOM_SNAP,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
      });

      L.tileLayer(MAP_TILE, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
        detectRetina: true,
        updateWhenIdle: false,
        keepBuffer: 2,
      }).addTo(map);

      const radiusMeters = radiusKm * 1000;
      const circle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: "#a3e635",
        weight: 2.5,
        fillColor: "#a3e635",
        fillOpacity: 0.18,
      }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        skipViewRef.current = true;
        circle.setLatLng(c);
        onCenterChangeRef.current(c.lat, c.lng);
      });

      mapRef.current = map;
      circleRef.current = circle;

      requestAnimationFrame(() => {
        safeApplyView(map, [lat, lng], radiusKm, lat);
      });
      lateViewTimer = setTimeout(() => {
        if (!cancelled) safeApplyView(map, [lat, lng], radiusKm, lat);
      }, 480);
    };

    initWhenSized();

    return () => {
      cancelled = true;
      if (lateViewTimer) clearTimeout(lateViewTimer);
      if (viewRafRef.current != null) cancelAnimationFrame(viewRafRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        circleRef.current = null;
      }
    };
  }, [sheetOpen]);

  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!sheetOpen || !map || !circle) return;

    const center: L.LatLngExpression = [lat, lng];
    const radiusMeters = radiusKm * 1000;
    circle.setLatLng(center);
    circle.setRadius(radiusMeters);

    if (skipViewRef.current) {
      skipViewRef.current = false;
      return;
    }

    if (viewRafRef.current != null) cancelAnimationFrame(viewRafRef.current);
    viewRafRef.current = requestAnimationFrame(() => {
      viewRafRef.current = null;
      const c = circle.getLatLng();
      safeApplyView(map, c, radiusKm, c.lat);
    });

    return () => {
      if (viewRafRef.current != null) {
        cancelAnimationFrame(viewRafRef.current);
        viewRafRef.current = null;
      }
    };
  }, [lat, lng, radiusKm, sheetOpen]);

  useEffect(() => {
    if (sheetOpen) return;
    initGenRef.current += 1;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      circleRef.current = null;
    }
  }, [sheetOpen]);

  return (
    <div
      className={cnMapLeaflet(className)}
      style={{ minHeight: 300, height: "100%" }}
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
    </div>
  );
}

function cnMapLeaflet(className?: string): string {
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
