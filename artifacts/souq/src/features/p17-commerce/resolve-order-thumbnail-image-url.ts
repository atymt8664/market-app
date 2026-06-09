import { resolveFirstAdImageUrl } from "./resolve-first-ad-image-url";

/** Same chain as order detail summary — ad gallery first, then API snapshot. */
export function resolveOrderThumbnailImageUrl(
  adImages: unknown,
  orderImageUrl?: string | null,
): string | null {
  return resolveFirstAdImageUrl(adImages) ?? (orderImageUrl?.trim() ? orderImageUrl.trim() : null);
}
