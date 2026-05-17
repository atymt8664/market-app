import {
  db,
  adsTable,
  adLikesTable,
  adFavoritesTable,
  categoriesTable,
  subcategoriesTable,
} from "@workspace/db";
import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { AdTextSearchContext } from "./ad-search";
import { keysetWhereDesc, keysetWhereSearchDesc, type DecodedCursor } from "./pagination";
import {
  fetchDenormalizedCounterMaps,
  useDenormalizedReactionCounters,
} from "./ad-reaction-counts";
import { mergeAdListRows, type AdListQueryRow } from "./ads-list-merge";

export type { AdListQueryRow };

type PageIdRow = { id: number; createdAt: Date; searchRank?: number };

function countMapFromRows(rows: Array<{ adId: number; c: number }>): Map<number, number> {
  return new Map(rows.map((r) => [r.adId, Number(r.c ?? 0)]));
}

/**
 * Efficient ad list fetch (Phase 7A.3a):
 * 1) page ad IDs with filters/order/limit
 * 2) reaction counts — denormalized table (7A.3c) or batch COUNT (7A.3a fallback)
 * 3) batch user like/favorite membership for page IDs only
 * 4) load ads + category joins for page IDs
 */
export async function fetchAdsList(params: {
  currentUserId?: number | null;
  where?: SQL;
  limit: number;
  /** When set, restricts to ads favorited by this user (GET /ads/favorites). */
  favoritesForUserId?: number;
  /** Phase 7A.4 — relevance-ranked search (requires USE_FTS_AD_SEARCH=1 + migration). */
  textSearch?: AdTextSearchContext | null;
  searchCursor?: DecodedCursor | null;
}): Promise<AdListQueryRow[]> {
  const { currentUserId, where, limit, favoritesForUserId, textSearch, searchCursor } =
    params;
  if (limit <= 0) return [];

  const pageWhere = where ? where : undefined;
  const rankExpr = textSearch?.rankExpr;

  let idQuery =
    favoritesForUserId !== undefined
      ? db
          .select({
            id: adsTable.id,
            createdAt: adsTable.createdAt,
            ...(rankExpr
              ? { searchRank: sql<number>`${rankExpr}`.as("search_rank") }
              : {}),
          })
          .from(adsTable)
          .innerJoin(
            adFavoritesTable,
            and(
              eq(adFavoritesTable.adId, adsTable.id),
              eq(adFavoritesTable.userId, favoritesForUserId),
            ),
          )
      : db
          .select({
            id: adsTable.id,
            createdAt: adsTable.createdAt,
            ...(rankExpr
              ? { searchRank: sql<number>`${rankExpr}`.as("search_rank") }
              : {}),
          })
          .from(adsTable);

  const cursorClause =
    searchCursor && rankExpr && searchCursor.r !== undefined
      ? keysetWhereSearchDesc(
          rankExpr,
          adsTable.createdAt,
          adsTable.id,
          { ...searchCursor, r: searchCursor.r },
        )
      : searchCursor
        ? keysetWhereDesc(adsTable.createdAt, adsTable.id, searchCursor)
        : undefined;

  const combinedWhere =
    pageWhere && cursorClause
      ? and(pageWhere, cursorClause)
      : pageWhere
        ? pageWhere
        : cursorClause;

  if (combinedWhere) {
    idQuery = idQuery.where(combinedWhere) as typeof idQuery;
  }

  const pageRows = (await (rankExpr
    ? idQuery.orderBy(
        desc(rankExpr),
        desc(adsTable.createdAt),
        desc(adsTable.id),
      )
    : idQuery.orderBy(desc(adsTable.createdAt), desc(adsTable.id))
  ).limit(limit)) as PageIdRow[];

  const pageIds = pageRows.map((r) => r.id);
  if (pageIds.length === 0) return [];

  const adRowsPromise = db
    .select({
      ads: adsTable,
      categoryName: categoriesTable.name,
      subcategoryName: subcategoriesTable.name,
    })
    .from(adsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, adsTable.categoryId))
    .leftJoin(
      subcategoriesTable,
      eq(subcategoriesTable.id, adsTable.subcategoryId),
    )
    .where(inArray(adsTable.id, pageIds));

  const counterMapsPromise = useDenormalizedReactionCounters()
    ? fetchDenormalizedCounterMaps(pageIds)
    : Promise.all([
        db
          .select({
            adId: adLikesTable.adId,
            c: count(),
          })
          .from(adLikesTable)
          .where(inArray(adLikesTable.adId, pageIds))
          .groupBy(adLikesTable.adId),
        db
          .select({
            adId: adFavoritesTable.adId,
            c: count(),
          })
          .from(adFavoritesTable)
          .where(inArray(adFavoritesTable.adId, pageIds))
          .groupBy(adFavoritesTable.adId),
      ]).then(([likeCountRows, favoriteCountRows]) => ({
        likeCountByAdId: countMapFromRows(
          likeCountRows.map((r) => ({ adId: r.adId, c: Number(r.c) })),
        ),
        favoriteCountByAdId: countMapFromRows(
          favoriteCountRows.map((r) => ({ adId: r.adId, c: Number(r.c) })),
        ),
      }));

  const [adRows, counterMaps] = await Promise.all([
    adRowsPromise,
    counterMapsPromise,
  ]);
  const likeCountByAdId = counterMaps.likeCountByAdId;
  const favoriteCountByAdId = counterMaps.favoriteCountByAdId;

  let likedAdIds = new Set<number>();
  let favoritedAdIds = new Set<number>();

  if (currentUserId) {
    const [likedRows, favoritedRows] = await Promise.all([
      db
        .select({ adId: adLikesTable.adId })
        .from(adLikesTable)
        .where(
          and(
            inArray(adLikesTable.adId, pageIds),
            eq(adLikesTable.userId, currentUserId),
          ),
        ),
      db
        .select({ adId: adFavoritesTable.adId })
        .from(adFavoritesTable)
        .where(
          and(
            inArray(adFavoritesTable.adId, pageIds),
            eq(adFavoritesTable.userId, currentUserId),
          ),
        ),
    ]);
    likedAdIds = new Set(likedRows.map((r) => r.adId));
    favoritedAdIds = new Set(favoritedRows.map((r) => r.adId));
  }

  const searchRankByAdId = rankExpr
    ? new Map(
        pageRows.map((r) => [r.id, Number(r.searchRank ?? 0)]),
      )
    : undefined;

  return mergeAdListRows(
    pageIds,
    adRows,
    likeCountByAdId,
    favoriteCountByAdId,
    likedAdIds,
    favoritedAdIds,
    searchRankByAdId,
  );
}
