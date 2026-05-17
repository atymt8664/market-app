import { adsTable } from "@workspace/db";
import { ilike, or, sql, type SQL } from "drizzle-orm";
import { normalizeCityFilter, normalizeSearchQuery } from "./ad-search-util";

/** Enable after 014 migration verified on target DB. */
export function useFtsAdSearch(): boolean {
  return process.env.USE_FTS_AD_SEARCH === "1";
}

export type AdTextSearchContext = {
  query: string;
  matchCondition: SQL;
  rankExpr: SQL;
  tsQueryExpr: SQL;
};

/**
 * Multilingual tsquery (simple + english + german + arabic) against combined search_vector.
 */
export function buildAdTextSearchContext(rawQ: string): AdTextSearchContext | null {
  const query = normalizeSearchQuery(rawQ);
  if (!query) return null;

  const tsQueryExpr = sql`(
    plainto_tsquery('simple', ${query}) ||
    plainto_tsquery('english', ${query}) ||
    plainto_tsquery('german', ${query}) ||
    plainto_tsquery('arabic', ${query})
  )`;

  const matchCondition = sql`${adsTable.searchVector} @@ ${tsQueryExpr}`;
  const rankExpr = sql`ts_rank_cd(${adsTable.searchVector}, ${tsQueryExpr}, 32)`;

  return { query, matchCondition, rankExpr, tsQueryExpr };
}

/** Legacy ILIKE fallback (7A.4 pre-flag / rollback). */
export function buildAdTextSearchIlikeCondition(rawQ: string): SQL | null {
  const query = normalizeSearchQuery(rawQ);
  if (!query) return null;
  const pat = `%${query}%`;
  return or(ilike(adsTable.title, pat), ilike(adsTable.description, pat)) ?? null;
}

/** City filter — FTS mode uses trigram-friendly match on lower(city). */
export function buildAdCityCondition(rawCity: string | undefined | null): SQL | null {
  const city = normalizeCityFilter(rawCity);
  if (!city) return null;

  if (useFtsAdSearch()) {
    const needle = city.toLowerCase();
    if (needle.length >= 3) {
      return sql`lower(${adsTable.city}) % ${needle}`;
    }
    return sql`lower(${adsTable.city}) LIKE ${`${needle}%`}`;
  }

  return ilike(adsTable.city, `%${city}%`);
}

export function buildAdSearchWhereParts(params: {
  q?: string | null;
  city?: string | null;
}): {
  textSearch: AdTextSearchContext | null;
  extraConditions: SQL[];
} {
  const extraConditions: SQL[] = [];
  let textSearch: AdTextSearchContext | null = null;

  if (params.q) {
    if (useFtsAdSearch()) {
      textSearch = buildAdTextSearchContext(params.q);
      if (textSearch) extraConditions.push(textSearch.matchCondition);
    } else {
      const ilikeCond = buildAdTextSearchIlikeCondition(params.q);
      if (ilikeCond) extraConditions.push(ilikeCond);
    }
  }

  const cityCond = buildAdCityCondition(params.city ?? null);
  if (cityCond) extraConditions.push(cityCond);

  return { textSearch, extraConditions };
}
