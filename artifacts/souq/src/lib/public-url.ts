/**
 * Canonical public URL for an ad (sharing, OG). Uses VITE_PUBLIC_APP_URL when set
 * (full site base, may include path), otherwise current origin + Vite BASE_PATH.
 */
export function getPublicAdUrl(adId: number): string {
  const envBase =
    typeof import.meta.env.VITE_PUBLIC_APP_URL === "string"
      ? import.meta.env.VITE_PUBLIC_APP_URL.trim()
      : "";
  if (envBase && /^https?:\/\//i.test(envBase)) {
    const root = envBase.endsWith("/") ? envBase : `${envBase}/`;
    return new URL(`ad/${adId}`, root).href;
  }
  if (typeof window === "undefined") return "";
  const baseUrl = new URL(
    import.meta.env.BASE_URL ?? "/",
    `${window.location.origin}/`,
  );
  return new URL(`ad/${adId}`, baseUrl).href;
}
