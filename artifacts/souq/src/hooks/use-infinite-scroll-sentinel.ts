import { useEffect, type RefObject } from "react";

type InfiniteScrollSentinelOptions = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
};

/** IntersectionObserver on scroll root — triggers fetchNextPage near list end. */
export function useInfiniteScrollSentinel(
  sentinelRef: RefObject<HTMLElement | null>,
  scrollRootRef: RefObject<HTMLElement | null>,
  {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin = "240px",
  }: InfiniteScrollSentinelOptions,
) {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRootRef.current;
    if (!sentinel || !root || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
      },
      { root, rootMargin, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    sentinelRef,
    scrollRootRef,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin,
  ]);
}
