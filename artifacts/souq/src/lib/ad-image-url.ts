/**
 * Supabase Storage image transforms for ad gallery (P9).
 * Original uploads are up to 1920px JPEG (~3–4 MB each); display variants
 * use /render/image/ so hero/thumbs decode in milliseconds on mobile.
 */

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/object\/public\/(.+)$/;

const SUPABASE_RENDER_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/render\/image\/public\/(.+?)(?:\?.*)?$/;

export type AdImageVariant = "thumb" | "hero" | "viewer" | "original";

const VARIANT_PARAMS: Record<
  Exclude<AdImageVariant, "original">,
  string
> = {
  /** 68px strip ×2 retina */
  thumb: "width=136&height=136&resize=cover&quality=75",
  /** ~380px hero ×2 retina, 4:3 cover */
  hero: "width=820&height=615&resize=cover&quality=80",
  /** Fullscreen viewer — sharp without full 1920px payload */
  viewer: "width=1280&resize=contain&quality=85",
};

function renderPublicUrl(base: string, objectPath: string, params: string): string {
  return `${base}/render/image/public/${objectPath}?${params}`;
}

/** Normalize any Supabase public/render URL back to the canonical object path. */
export function getAdImageOriginalUrl(url: string): string {
  if (!url) return url;
  const objectMatch = url.match(SUPABASE_OBJECT_PUBLIC);
  if (objectMatch) return url;
  const renderMatch = url.match(SUPABASE_RENDER_PUBLIC);
  if (renderMatch) {
    return `${renderMatch[1]}/object/public/${renderMatch[2]}`;
  }
  return url;
}

export function getAdImageUrl(
  originalUrl: string,
  variant: AdImageVariant = "original",
): string {
  if (!originalUrl || variant === "original") {
    return getAdImageOriginalUrl(originalUrl);
  }

  const params = VARIANT_PARAMS[variant];
  const objectMatch = originalUrl.match(SUPABASE_OBJECT_PUBLIC);
  if (objectMatch) {
    return renderPublicUrl(objectMatch[1], objectMatch[2], params);
  }

  const renderMatch = originalUrl.match(SUPABASE_RENDER_PUBLIC);
  if (renderMatch) {
    return renderPublicUrl(renderMatch[1], renderMatch[2], params);
  }

  return originalUrl;
}

export const getAdImageThumbUrl = (url: string) =>
  getAdImageUrl(url, "thumb");

export const getAdImageHeroUrl = (url: string) =>
  getAdImageUrl(url, "hero");

export const getAdImageViewerUrl = (url: string) =>
  getAdImageUrl(url, "viewer");
