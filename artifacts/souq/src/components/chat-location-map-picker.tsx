import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LEAFLET_MIN_MAP_PX,
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

const DEFAULT_ZOOM = 12;

export type ChatLocationMapFlyTarget = {
  lat: number;
  lng: number;
  zoom: number;
  /** Bumped by parent to re-trigger the same coordinates. */
  token: number;
};

export type ChatLocationMapPickerProps = {
  lat: number;
  lng: number;
  flyTo?: ChatLocationMapFlyTarget | null;
  onCenterChange: (lat: number, lng: number) => void;
  onUserAdjust?: () => void;
  active?: boolean;
  className?: string;
};

export function ChatLocationMapPicker({
  lat,
  lng,
  flyTo,
  onCenterChange,
  onUserAdjust,
  active = true,
  className,
}: ChatLocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const onUserAdjustRef = useRef(onUserAdjust);
  const skipMoveRef = useRef(false);
  const initGenRef = useRef(0);
  const lastFlyTokenRef = useRef<number | null>(null);
  onCenterChangeRef.current = onCenterChange;
  onUserAdjustRef.current = onUserAdjust;

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const gen = ++initGenRef.current;
    let cancelled = false;
    let lateSizeTimer: ReturnType<typeof setTimeout> | null = null;

    const initWhenSized = () => {
      if (cancelled || gen !== initGenRef.current || mapRef.current) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < LEAFLET_MIN_MAP_PX || height < LEAFLET_MIN_MAP_PX) {
        requestAnimationFrame(initWhenSized);
        return;
      }

      const map = L.map(el, {
        center: [lat, lng],
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
      });

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        subdomains: "abcd",
        maxZoom: 20,
        detectRetina: true,
        updateWhenIdle: false,
        keepBuffer: 2,
      }).addTo(map);

      map.on("dragstart", () => {
        onUserAdjustRef.current?.();
      });

      map.on("moveend", () => {
        if (skipMoveRef.current) {
          skipMoveRef.current = false;
          return;
        }
        const c = map.getCenter();
        onCenterChangeRef.current(c.lat, c.lng);
      });

      mapRef.current = map;

      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
          map.setView([lat, lng], DEFAULT_ZOOM, { animate: false });
        } catch {
          /* sheet animation */
        }
      });
      lateSizeTimer = setTimeout(() => {
        if (!cancelled && mapRef.current) {
          try {
            mapRef.current.invalidateSize({ animate: false });
          } catch {
            /* ignore */
          }
        }
      }, 480);
    };

    initWhenSized();

    return () => {
      cancelled = true;
      if (lateSizeTimer) clearTimeout(lateSizeTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      lastFlyTokenRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!active || !map || !flyTo) return;
    if (lastFlyTokenRef.current === flyTo.token) return;
    lastFlyTokenRef.current = flyTo.token;

    skipMoveRef.current = true;
    try {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, {
        animate: true,
        duration: 0.85,
      });
      onCenterChangeRef.current(flyTo.lat, flyTo.lng);
    } catch {
      /* ignore */
    }
  }, [active, flyTo]);

  useEffect(() => {
    if (active) return;
    initGenRef.current += 1;
    lastFlyTokenRef.current = null;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [active]);

  return (
    <div
      className={leafletMapShellClass(className)}
      style={{ minHeight: 280, height: "100%" }}
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"
        aria-hidden
      >
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute h-14 w-14 rounded-full border-2 border-primary/35 bg-primary/10 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.55)]" />
          <span className="relative h-4 w-4 rounded-full border-2 border-white bg-primary shadow-[0_0_12px_rgba(182,227,86,0.75)]" />
        </span>
      </div>
    </div>
  );
}
