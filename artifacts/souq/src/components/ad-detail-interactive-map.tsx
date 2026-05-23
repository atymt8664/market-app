/**
 * Interactive city map for ad detail (P3) — zoom/drag in-card, lazy-loaded with Leaflet.
 */
import { memo, useEffect, useRef, type MouseEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_URL,
  leafletMapShellClass,
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

export type AdDetailInteractiveMapProps = {
  lat: number;
  lng: number;
  city: string;
  className?: string;
  onCardTap?: () => void;
};

function AdDetailInteractiveMapInner({
  lat,
  lng,
  city,
  className,
  onCardTap,
}: AdDetailInteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const dragRef = useRef(false);
  const onCardTapRef = useRef(onCardTap);
  onCardTapRef.current = onCardTap;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [lat, lng],
      zoom: CITY_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: true,
      touchZoom: true,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.marker([lat, lng], {
      icon: limeMarkerIcon,
      interactive: false,
    }).addTo(map);

    map.on("dragstart", () => {
      dragRef.current = true;
    });
    map.on("dragend", () => {
      window.setTimeout(() => {
        dragRef.current = false;
      }, 80);
    });
    map.on("click", () => {
      if (!dragRef.current) onCardTapRef.current?.();
    });

    mapRef.current = map;

    const raf = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
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

  return (
    <div className={cn(leafletMapShellClass(className), "group/map")}>
      <div
        ref={containerRef}
        className="absolute inset-0 touch-manipulation"
        role="img"
        aria-label={t("ad_detail.location.map_alt", { city })}
      />
      <div className="pointer-events-none absolute inset-0 z-[450] bg-gradient-to-t from-black/25 via-transparent to-black/10" />
      <div className="absolute bottom-2 end-2 z-[500] flex flex-col gap-1">
        <button
          type="button"
          onClick={zoomBy(1)}
          className="pointer-events-auto flex h-8 w-8 touch-manipulation items-center justify-center rounded-xl border border-primary/50 bg-zinc-950/90 text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.45)] ring-1 ring-primary/20 transition-[transform,border-color] hover:border-primary/70 active:scale-95"
          aria-label={t("ad_detail.location.zoom_in")}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={zoomBy(-1)}
          className="pointer-events-auto flex h-8 w-8 touch-manipulation items-center justify-center rounded-xl border border-primary/50 bg-zinc-950/90 text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.45)] ring-1 ring-primary/20 transition-[transform,border-color] hover:border-primary/70 active:scale-95"
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
