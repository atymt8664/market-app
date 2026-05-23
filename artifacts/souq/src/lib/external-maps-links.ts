/** Open native-friendly maps app (Apple Maps on iOS, Google Maps elsewhere). */
export function buildExternalMapsUrl(
  lat: number,
  lng: number,
  label?: string,
): string {
  const q = label?.trim()
    ? encodeURIComponent(label.trim())
    : encodeURIComponent(`${lat},${lng}`);
  const isApple =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isApple) {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function openExternalMaps(
  lat: number,
  lng: number,
  label?: string,
): void {
  const url = buildExternalMapsUrl(lat, lng, label);
  window.open(url, "_blank", "noopener,noreferrer");
}
