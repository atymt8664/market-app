import { getListFeaturedAdsQueryKey } from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { getAdImageHeroUrl } from "@/lib/ad-image-url";

type FeaturedRow = { images?: string[] };

let featuredPromise: Promise<FeaturedRow[] | null> | null = null;

function isHomePathname(pathname: string): boolean {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const stripped =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
  return stripped === "/" || stripped === "";
}

function injectLcpImagePreload(heroUrl: string): void {
  if (typeof document === "undefined" || !heroUrl) return;
  const id = "p7-lcp-hero-preload";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "preload";
  link.as = "image";
  link.href = heroUrl;
  link.setAttribute("fetchpriority", "high");
  document.head.appendChild(link);
}

function fetchFeaturedAds(): Promise<FeaturedRow[] | null> {
  if (!featuredPromise) {
    featuredPromise = fetch(apiUrl("/api/ads/featured"), {
      credentials: "include",
      priority: "high",
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return featuredPromise;
}

/** P7-PR-9: featured API + LCP image preload before React mount on Home. */
export function startHomeLcpPrefetch(): void {
  if (typeof window === "undefined") return;
  if (!isHomePathname(window.location.pathname)) return;

  void fetchFeaturedAds().then((data) => {
    if (!Array.isArray(data) || data.length === 0) return;
    const raw = data[0]?.images?.[0];
    if (raw) injectLcpImagePreload(getAdImageHeroUrl(raw));
  });
}

export function wireHomeLcpPrefetchToQueryClient(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;
  if (!isHomePathname(window.location.pathname)) return;

  void fetchFeaturedAds().then((data) => {
    if (!Array.isArray(data)) return;
    queryClient.setQueryData(getListFeaturedAdsQueryKey(), data);
    const raw = data[0]?.images?.[0];
    if (raw) injectLcpImagePreload(getAdImageHeroUrl(raw));
  });
}
