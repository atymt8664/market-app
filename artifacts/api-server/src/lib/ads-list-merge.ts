import type { adsTable } from "@workspace/db";

/** Row shape expected by `serializeAd` in ads routes. */
export type AdListQueryRow = {
  ads: typeof adsTable.$inferSelect;
  categoryName: string | null;
  subcategoryName: string | null;
  likeCount: number;
  favoriteCount: number;
  isLiked: boolean;
  isFavorited: boolean;
  /** Internal — FTS rank for search pagination (not serialized). */
  searchRank?: number;
};

type AdCoreRow = {
  ads: typeof adsTable.$inferSelect;
  categoryName: string | null;
  subcategoryName: string | null;
};

/** Pure merge — batch reaction maps onto page-ordered ads (unit-testable without DB). */
export function mergeAdListRows(
  pageIds: number[],
  adRows: AdCoreRow[],
  likeCountByAdId: Map<number, number>,
  favoriteCountByAdId: Map<number, number>,
  likedAdIds: Set<number>,
  favoritedAdIds: Set<number>,
  searchRankByAdId?: Map<number, number>,
): AdListQueryRow[] {
  const byId = new Map(adRows.map((row) => [row.ads.id, row]));
  const merged: AdListQueryRow[] = [];
  for (const id of pageIds) {
    const core = byId.get(id);
    if (!core) continue;
    const searchRank = searchRankByAdId?.get(id);
    merged.push({
      ads: core.ads,
      categoryName: core.categoryName,
      subcategoryName: core.subcategoryName,
      likeCount: likeCountByAdId.get(id) ?? 0,
      favoriteCount: favoriteCountByAdId.get(id) ?? 0,
      isLiked: likedAdIds.has(id),
      isFavorited: favoritedAdIds.has(id),
      ...(searchRank !== undefined ? { searchRank } : {}),
    });
  }
  return merged;
}
