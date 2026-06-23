import { useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchHomeFeedPage,
  HOME_FEED_PAGE_SIZE,
} from "@/lib/home-feed-infinite-api";
import {
  HOME_PUBLIC_QUERY_RETRY,
} from "@/lib/home-query-recovery";

/** React Query: home feed pages — shorter stale than categories, longer than zero. */
const HOME_STALE_FEED_MS = 90 * 1000;

export const HOME_FEED_INFINITE_QUERY_ROOT = "home-feed-infinite" as const;

export function getHomeFeedInfiniteQueryKey(city: string | undefined | null) {
  const normalized = city?.trim() || "all";
  return [HOME_FEED_INFINITE_QUERY_ROOT, normalized] as const;
}

export function useHomeFeedInfiniteAds(city: string | undefined | null) {
  const feedCity = city?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: getHomeFeedInfiniteQueryKey(feedCity),
    queryFn: ({ pageParam, signal }) =>
      fetchHomeFeedPage(
        {
          limit: HOME_FEED_PAGE_SIZE,
          ...(feedCity ? { city: feedCity } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    staleTime: HOME_STALE_FEED_MS,
    retry: HOME_PUBLIC_QUERY_RETRY,
  });
}
