import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHomeFeedMeta, type HomeFeedSnapshot } from "@/lib/home-feed-meta-api";

/** Aligns with HOME_STALE_FEED_MS — light background poll only when tab is visible. */
export const HOME_FEED_META_POLL_MS = 90_000;

/** First probe after feed snapshot — avoids noise during hydration. */
export const HOME_FEED_META_INITIAL_DELAY_MS = 30_000;

function resolvePollMs(): number {
  if (import.meta.env.DEV) return 15_000;
  return HOME_FEED_META_POLL_MS;
}

function resolveInitialDelayMs(): number {
  if (import.meta.env.DEV) return 2_000;
  return HOME_FEED_META_INITIAL_DELAY_MS;
}

type UseHomeNewAdsPollOptions = {
  enabled: boolean;
  snapshot: HomeFeedSnapshot | null;
  city?: string | null;
  onRefresh: () => Promise<unknown>;
};

export function useHomeNewAdsPoll({
  enabled,
  snapshot,
  city,
  onRefresh,
}: UseHomeNewAdsPollOptions) {
  const [newCount, setNewCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!enabled || !snapshot) {
      setNewCount(0);
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pollMs = resolvePollMs();
    const initialDelayMs = resolveInitialDelayMs();

    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      const current = snapshotRef.current;
      if (!current) return;
      try {
        const meta = await fetchHomeFeedMeta(current, { city });
        if (cancelled) return;
        setNewCount(meta.count > 0 ? meta.count : 0);
      } catch {
        /* silent — next visible tick retries */
      }
    };

    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(() => void tick(), pollMs);
    };

    const stopInterval = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        startInterval();
        void tick();
      } else {
        stopInterval();
      }
    };

    if (document.visibilityState === "visible") {
      startInterval();
      const initialDelay = setTimeout(() => void tick(), initialDelayMs);
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        cancelled = true;
        clearTimeout(initialDelay);
        stopInterval();
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, snapshot?.since, snapshot?.afterId, city]);

  const applyRefresh = useCallback(async () => {
    setRefreshing(true);
    setNewCount(0);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return { newCount, applyRefresh, refreshing };
}
