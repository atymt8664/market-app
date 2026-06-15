import { getListFeaturedAdsQueryKey, getListRecommendedAdsQueryKey } from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { getAdImageFeaturedLeadUrl } from "@/lib/ad-image-url";
import { isHomePathname } from "@/lib/p7-home-path";

type FeaturedRow = { images?: string[] };

let featuredPromise: Promise<FeaturedRow[] | null> | null = null;
let recommendedPromise: Promise<unknown[] | null> | null = null;

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

function fetchRecommendedAds(): Promise<unknown[] | null> {
  if (!recommendedPromise) {
    recommendedPromise = fetch(apiUrl("/api/ads/recommended"), {
      credentials: "include",
      priority: "high",
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return recommendedPromise;
}

function seedFeaturedPreload(data: FeaturedRow[] | null): void {
  if (!Array.isArray(data) || data.length === 0) return;
  const raw = data[0]?.images?.[0];
  if (raw) injectLcpImagePreload(getAdImageFeaturedLeadUrl(raw));
}

/** P7-PR-9: featured API + LCP image preload before React mount on Home. */
export function startHomeLcpPrefetch(): void {
  if (typeof window === "undefined" || !isHomePathname()) return;
  void fetchFeaturedAds().then(seedFeaturedPreload);
}

/** P9-3B: recommended API prefetch in parallel with featured on Home cold path. */
export function startHomeRecommendedPrefetch(): void {
  if (typeof window === "undefined" || !isHomePathname()) return;
  void fetchRecommendedAds();
}

export function wireHomeLcpPrefetchToQueryClient(queryClient: QueryClient): void {
  if (typeof window === "undefined" || !isHomePathname()) return;

  void fetchFeaturedAds().then((data) => {
    if (!Array.isArray(data)) return;
    queryClient.setQueryData(getListFeaturedAdsQueryKey(), data);
    seedFeaturedPreload(data);
  });

  void fetchRecommendedAds().then((data) => {
    if (!Array.isArray(data)) return;
    queryClient.setQueryData(getListRecommendedAdsQueryKey(), data);
  });
}
