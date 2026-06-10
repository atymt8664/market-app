import { NOMINATIM_USER_AGENT } from "@/lib/leaflet-map-shared";

export type ChatLocationPlace = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
};

function nominatimHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": "ar,en,de",
    "User-Agent": NOMINATIM_USER_AGENT,
  };
}

export async function reverseGeocodeChatLocation(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url, { headers: nominatimHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    const name = typeof data.display_name === "string" ? data.display_name.trim() : "";
    return name || null;
  } catch {
    return null;
  }
}

/** Nearby named places (OSM) within ~500 m — same ecosystem as existing map tiles. */
export async function fetchChatNearbyPlaces(
  lat: number,
  lng: number,
): Promise<ChatLocationPlace[]> {
  const query = `[out:json][timeout:8];(node(around:500,${lat},${lng})["name"]["amenity"];node(around:500,${lat},${lng})["name"]["shop"];node(around:500,${lat},${lng})["name"]["office"];);out center 12;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      elements?: Array<{
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string; amenity?: string; shop?: string };
      }>;
    };
    const out: ChatLocationPlace[] = [];
    const seen = new Set<string>();
    for (const el of data.elements ?? []) {
      const name = el.tags?.name?.trim();
      if (!name) continue;
      const plat = el.lat ?? el.center?.lat;
      const plng = el.lon ?? el.center?.lon;
      if (!Number.isFinite(plat) || !Number.isFinite(plng)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const kind = el.tags?.amenity ?? el.tags?.shop ?? "";
      out.push({
        id: `osm-${el.id}`,
        label: name,
        subtitle: kind.replace(/_/g, " "),
        lat: plat!,
        lng: plng!,
      });
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}
