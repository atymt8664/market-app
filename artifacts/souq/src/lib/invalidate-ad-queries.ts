import type { QueryClient } from "@tanstack/react-query";
import type { Ad } from "@workspace/api-client-react";
import {
  getGetAdQueryKey,
  getListFavoriteAdsQueryKey,
  getListFeaturedAdsQueryKey,
  getListRecommendedAdsQueryKey,
} from "@workspace/api-client-react";

/** Query key roots whose data is `Ad[]` and should be patched in-place. */
const AD_LIST_ROOTS = [
  ["/api/ads"],
  ["/api/ads/featured"],
  ["/api/ads/recommended"],
  ["/api/ads/mine"],
  ["/api/ads/favorites"],
] as const;

function mapAdList(
  old: Ad[] | undefined,
  adId: number,
  patch: Partial<Ad>,
): Ad[] | undefined {
  if (!Array.isArray(old)) return old;
  return old.map((a) => (a.id === adId ? { ...a, ...patch } : a));
}

/**
 * Updates engagement fields on the ad detail entry and every cached list that
 * contains this ad (instant UI + stats sync without waiting for refetch).
 */
export function patchAdEngagementInCaches(
  queryClient: QueryClient,
  adId: number,
  patch: Partial<
    Pick<Ad, "favoriteCount" | "isFavorited" | "likeCount" | "isLiked">
  >,
) {
  queryClient.setQueryData<Ad>(getGetAdQueryKey(adId), (old) =>
    old?.id === adId ? { ...old, ...patch } : old,
  );
  for (const key of AD_LIST_ROOTS) {
    queryClient.setQueriesData<Ad[]>({ queryKey: [...key], exact: false }, (old) =>
      mapAdList(old, adId, patch),
    );
  }
}

/** Merges server ad into detail cache and every list row with the same id. */
export function upsertAdInListCaches(queryClient: QueryClient, ad: Ad) {
  queryClient.setQueryData(getGetAdQueryKey(ad.id), ad);
  for (const key of AD_LIST_ROOTS) {
    queryClient.setQueriesData<Ad[]>({ queryKey: [...key], exact: false }, (old) =>
      mapAdList(old, ad.id, ad),
    );
  }
}

/** After favorite / unfavorite — refetch to align with server and secondary views. */
export function invalidateAdRelatedQueries(queryClient: QueryClient, adId: number) {
  queryClient.invalidateQueries({ queryKey: getListFavoriteAdsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getListFeaturedAdsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getListRecommendedAdsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetAdQueryKey(adId) });
  queryClient.invalidateQueries({ queryKey: ["/api/ads"] });
  queryClient.invalidateQueries({ queryKey: ["/api/ads/stats"] });
}

/** After create/update ad — keep listings, profile, and detail consistent. */
export function invalidateAfterAdSave(
  queryClient: QueryClient,
  adId: number,
) {
  invalidateAdRelatedQueries(queryClient, adId);
  queryClient.invalidateQueries({ queryKey: ["/api/ads/mine"] });
}
