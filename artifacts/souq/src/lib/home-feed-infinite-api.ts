import {
  getListAdsUrl,
  type Ad,
  type ListAdsParams,
} from "@workspace/api-client-react";
import { parseAdminPaginationHeaders } from "@/features/admin/admin-pagination";
import { apiUrl } from "@/lib/api-url";

export const HOME_FEED_PAGE_SIZE = 20;

export type HomeFeedPage = {
  items: Ad[];
  nextCursor: string | null;
  hasNext: boolean;
};

/** GET /api/ads with cursor pagination headers (X-Pagination-Next-Cursor). */
export async function fetchHomeFeedPage(
  params: ListAdsParams,
  signal?: AbortSignal,
): Promise<HomeFeedPage> {
  const res = await fetch(apiUrl(getListAdsUrl(params)), {
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    throw new Error(`list-ads ${res.status}`);
  }

  const items = (await res.json()) as Ad[];
  const pagination = parseAdminPaginationHeaders(res);

  return {
    items,
    nextCursor: pagination.nextCursor,
    hasNext: pagination.hasNext || Boolean(pagination.nextCursor),
  };
}
