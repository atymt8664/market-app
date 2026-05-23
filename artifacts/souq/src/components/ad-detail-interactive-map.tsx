/**
 * Interactive city map for ad detail (P3) — zoom/drag in-card, lazy-loaded with Leaflet.
 */
import { memo, useEffect, useRef, type MouseEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import {
  adDetailMapShellClass,
  LEAFLET_MIN_MAP_PX,
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_URL,
} from "@/lib/leaflet-map-shared";

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

const CITY_ZOOM = 12;
const MIN_ZOOM = 8;
const MAX_ZOOM = 16;

const limeMarkerIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:hsl(82 72% 50%);border:2.5px solid #fff;box-shadow:0 0 12px rgba(182,227,86,0.65),0 1px 4px rgba(0,0,0,0.35);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const mapControlBtnClass =
  "pointer-events-auto flex h-8 w-8 touch-manipulation items-center justify-center rounded-xl border border-primary/50 bg-zinc-950/90 text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.45)] ring-1 ring-primary/20 transition-[transform,border-color] hover:border-primary/70 active:scale-95";

export type AdDetailInteractiveMapProps = {
  lat: number;
  lng: number;
  city: string;
  onOpenExternal?: () => void;
};

function AdDetailInteractiveMapInner({
  lat,
  lng,
  city,
  onOpenExternal,
}: AdDetailInteractiveMapProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onOpenExternalRef = useRef(onOpenExternal);
  onOpenExternalRef.current = onOpenExternal;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;
    let lateSizeTimer: ReturnType<typeof setTimeout> | null = null;
    let initRaf = 0;
    let resizeObs: ResizeObserver | null = null;

    const invalidateMapSize = (map: L.Map) => {
      try {
        const { width, height } = el.getBoundingClientRect();
        if (width >= LEAFLET_MIN_MAP_PX && height >= LEAFLET_MIN_MAP_PX) {
          map.invalidateSize({ animate: false });
        }
      } catch {
        /* map tearing down */
      }
    };

    const initWhenSized = () => {
      if (cancelled || mapRef.current) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < LEAFLET_MIN_MAP_PX || height < LEAFLET_MIN_MAP_PX) {
        initRaf = requestAnimationFrame(initWhenSized);
        return;
      }

      const map = L.map(el, {
        center: [lat, lng],
        zoom: CITY_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        subdomains: "abcd",
        maxZoom: 19,
        detectRetina: true,
        updateWhenIdle: false,
        keepBuffer: 2,
      }).addTo(map);

      markerRef.current = L.marker([lat, lng], {
        icon: limeMarkerIcon,
        interactive: false,
      }).addTo(map);

      mapRef.current = map;

      resizeObs = new ResizeObserver(() => {
        if (!cancelled && mapRef.current) invalidateMapSize(mapRef.current);
      });
      resizeObs.observe(el);

      requestAnimationFrame(() => invalidateMapSize(map));
      lateSizeTimer = setTimeout(() => {
        if (!cancelled && mapRef.current) invalidateMapSize(mapRef.current);
      }, 480);
    };

    initWhenSized();

    return () => {
      cancelled = true;
      if (initRaf) cancelAnimationFrame(initRaf);
      if (lateSizeTimer) clearTimeout(lateSizeTimer);
      resizeObs?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once per mount
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const center: L.LatLngExpression = [lat, lng];
    map.setView(center, map.getZoom(), { animate: false });
    markerRef.current?.setLatLng(center);
  }, [lat, lng]);

  const zoomBy = (delta: number) => (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const map = mapRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  };

  const openExternal = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenExternalRef.current?.();
  };

  return (
    <div ref={shellRef} className={adDetailMapShellClass()}>
      <div
        ref={containerRef}
        className="h-full w-full touch-manipulation"
        role="img"
        aria-label={t("ad_detail.location.map_alt", { city })}
      />
      {onOpenExternal ? (
        <button
          type="button"
          onClick={openExternal}
          className={cn(mapControlBtnClass, "absolute start-2 top-2 z-[500]")}
          aria-label={t("ad_detail.location.open_in_maps")}
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      ) : null}
      <div className="absolute end-2 top-1/2 z-[500] flex -translate-y-1/2 flex-col gap-1">
        <button
          type="button"
          onClick={zoomBy(1)}
          className={mapControlBtnClass}
          aria-label={t("ad_detail.location.zoom_in")}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={zoomBy(-1)}
          className={mapControlBtnClass}
          aria-label={t("ad_detail.location.zoom_out")}
        >
          <Minus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export const AdDetailInteractiveMap = memo(AdDetailInteractiveMapInner);
AdDetailInteractiveMap.displayName = "AdDetailInteractiveMap";
