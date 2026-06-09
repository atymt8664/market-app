/** First gallery URL from GET /api/ads/:id — mirrors API firstAdImage for list/detail parity. */
export function resolveFirstAdImageUrl(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === "string" && item.trim().length > 0) return item.trim();
    if (item && typeof item === "object" && "url" in item) {
      const url = (item as { url?: unknown }).url;
      if (typeof url === "string" && url.trim().length > 0) return url.trim();
    }
  }
  return null;
}
