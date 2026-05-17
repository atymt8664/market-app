import {
  db,
  adsTable,
  adLikesTable,
  adFavoritesTable,
  categoriesTable,
  subcategoriesTable,
} from "@workspace/db";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { mergeAdListRows, type AdListQueryRow } from "./ads-list-merge";

export type { AdListQueryRow };

type PageIdRow = { id: number; createdAt: Date };

function countMapFromRows(rows: Array<{ adId: number; c: number }>): Map<number, number> {
  return new Map(rows.map((r) => [r.adId, Number(r.c ?? 0)]));
}

/**
 * Efficient ad list fetch (Phase 7A.3a):
 * 1) page ad IDs with filters/order/limit
 * 2) batch COUNT for page IDs only
 * 3) batch user like/favorite membership for page IDs only
 * 4) load ads + category joins for page IDs
 */
export async function fetchAdsList(params: {
  currentUserId?: number | null;
  where?: SQL;
  limit: number;
  /** When set, restricts to ads favorited by this user (GET /ads/favorites). */
  favoritesForUserId?: number;
}): Promise<AdListQueryRow[]> {
  const { currentUserId, where, limit, favoritesForUserId } = params;
  if (limit <= 0) return [];

  const pageWhere = where ? where : undefined;
  const idSelect = {
    id: adsTable.id,
    createdAt: adsTable.createdAt,
  };

  let idQuery =
    favoritesForUserId !== undefined
      ? db
          .select(idSelect)
          .from(adsTable)
          .innerJoin(
            adFavoritesTable,
            and(
              eq(adFavoritesTable.adId, adsTable.id),
              eq(adFavoritesTable.userId, favoritesForUserId),
            ),
          )
      : db.select(idSelect).from(adsTable);

  if (pageWhere) {
    idQuery = idQuery.where(pageWhere) as typeof idQuery;
  }

  const pageRows = (await idQuery
    .orderBy(desc(adsTable.createdAt), desc(adsTable.id))
    .limit(limit)) as PageIdRow[];

  const pageIds = pageRows.map((r) => r.id);
  if (pageIds.length === 0) return [];

  const [likeCountRows, favoriteCountRows, adRows] = await Promise.all([
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
    db
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
      .where(inArray(adsTable.id, pageIds)),
  ]);

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

  return mergeAdListRows(
    pageIds,
    adRows,
    countMapFromRows(likeCountRows.map((r) => ({ adId: r.adId, c: Number(r.c) }))),
    countMapFromRows(
      favoriteCountRows.map((r) => ({ adId: r.adId, c: Number(r.c) })),
    ),
    likedAdIds,
    favoritedAdIds,
  );
}
