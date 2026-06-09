import { resolveFirstAdImageUrl } from "./resolve-first-ad-image-url.ts";

/** Same chain as API resolveOrderListImage — snapshot first, then ad gallery. */
export function resolveOrderThumbnailImageUrl(
  adImages: unknown,
  orderImageUrl?: string | null,
): string | null {
  const snapshot = orderImageUrl?.trim();
  if (snapshot) return snapshot;
  return resolveFirstAdImageUrl(adImages);
}
