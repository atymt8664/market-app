import type { Ad } from "@workspace/api-client-react";
import type { HomeFeedSnapshot } from "@/lib/home-feed-meta-api";

const EPOCH_ISO = new Date(0).toISOString();

function adSortKey(ad: Ad): { ts: number; id: number } {
  const ts = Date.parse(ad.createdAt);
  return { ts: Number.isFinite(ts) ? ts : 0, id: ad.id };
}

/**
 * Latest public listing on the current home feed — used as polling baseline.
 * Empty feed uses `emptyBaselineIso` (page-ready time) so we do not banner all historical ads.
 */
export function computeHomeFeedSnapshot(
  featured: readonly Ad[],
  recommended: readonly Ad[],
  emptyBaselineIso?: string | null,
): HomeFeedSnapshot {
  const merged = [...featured, ...recommended];
  if (merged.length === 0) {
    return {
      since: emptyBaselineIso?.trim() || EPOCH_ISO,
      afterId: 0,
    };
  }

  let bestTs = 0;
  let bestId = 0;
  for (const ad of merged) {
    const { ts, id } = adSortKey(ad);
    if (ts > bestTs || (ts === bestTs && id > bestId)) {
      bestTs = ts;
      bestId = id;
    }
  }

  return {
    since: new Date(bestTs).toISOString(),
    afterId: bestId,
  };
}
