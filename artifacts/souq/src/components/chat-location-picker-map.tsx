import { memo, useEffect, useRef } from "react";
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

const PICKER_ZOOM = 16;

const limeMarkerIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:hsl(82 72% 50%);border:2px solid #fff;box-shadow:0 0 12px rgba(182,227,86,0.65);"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type ChatLocationPickerMapProps = {
  lat: number;
  lng: number;
  sheetOpen?: boolean;
  className?: string;
  onCenterChange?: (lat: number, lng: number) => void;
};

function ChatLocationPickerMapInner({
  lat,
  lng,
  sheetOpen = true,
  className,
  onCenterChange,
}: ChatLocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  useEffect(() => {
    if (!sheetOpen) return;
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;

    const initWhenSized = () => {
      if (cancelled || mapRef.current) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < LEAFLET_MIN_MAP_PX || height < 80) {
        requestAnimationFrame(initWhenSized);
        return;
      }

      const map = L.map(el, {
        center: [lat, lng],
        zoom: PICKER_ZOOM,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
      });

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      const marker = L.marker([lat, lng], { icon: limeMarkerIcon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onCenterChangeRef.current?.(pos.lat, pos.lng);
      });
      map.on("moveend", () => {
        const c = map.getCenter();
        marker.setLatLng(c);
        onCenterChangeRef.current?.(c.lat, c.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch {
          /* ignore */
        }
      });
    };

    initWhenSized();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [sheetOpen]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], map.getZoom(), { animate: true, duration: 0.2 });
  }, [lat, lng]);

  return (
    <div className={leafletMapShellClass(className ?? "h-[11rem] w-full rounded-2xl border border-primary/25")}>
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
    </div>
  );
}

export const ChatLocationPickerMap = memo(ChatLocationPickerMapInner);
