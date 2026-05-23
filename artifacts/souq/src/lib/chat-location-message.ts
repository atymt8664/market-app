export const CHAT_LOCATION_MESSAGE_TYPE = "location" as const;

export type ChatLocationPayload = {
  lat: number;
  lng: number;
};

export function isValidChatCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

export function parseChatLocationBody(
  body: string,
  messageType?: string,
): ChatLocationPayload | null {
  if (messageType !== CHAT_LOCATION_MESSAGE_TYPE) return null;
  try {
    const o = JSON.parse(body) as { lat?: unknown; lng?: unknown };
    const lat = Number(o.lat);
    const lng = Number(o.lng);
    if (!isValidChatCoordinates(lat, lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function buildChatLocationMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}
