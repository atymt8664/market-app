import { memo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
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

const PREVIEW_ZOOM = 14;

const limeMarkerIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:hsl(82 72% 50%);border:2px solid #fff;box-shadow:0 0 10px rgba(182,227,86,0.6);"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type ChatLocationMapPreviewProps = {
  lat: number;
  lng: number;
  className?: string;
};

function ChatLocationMapPreviewInner({ lat, lng, className }: ChatLocationMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;

    const initWhenSized = () => {
      if (cancelled || mapRef.current) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < LEAFLET_MIN_MAP_PX || height < 40) {
        requestAnimationFrame(initWhenSized);
        return;
      }

      const map = L.map(el, {
        center: [lat, lng],
        zoom: PREVIEW_ZOOM,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      L.marker([lat, lng], { icon: limeMarkerIcon, interactive: false }).addTo(map);
      mapRef.current = map;

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
      }
    };
  }, [lat, lng]);

  return (
    <div
      className={[
        "relative h-[7.5rem] w-full overflow-hidden rounded-xl border border-primary/25 bg-[#e8ecf1]",
        "[&_.leaflet-container]:!h-full [&_.leaflet-container]:!w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
    </div>
  );
}

export const ChatLocationMapPreview = memo(ChatLocationMapPreviewInner);
