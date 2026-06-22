import { apiUrl } from "@/lib/api-url";

export type HomeFeedMeta = {
  count: number;
  newestAdId: number;
  newestCreatedAt: string | null;
};

export type HomeFeedSnapshot = {
  since: string;
  afterId: number;
};

export async function fetchHomeFeedMeta(
  snapshot: HomeFeedSnapshot,
  options?: { city?: string | null; signal?: AbortSignal },
): Promise<HomeFeedMeta> {
  const params = new URLSearchParams({
    since: snapshot.since,
    afterId: String(snapshot.afterId),
  });
  const city = options?.city?.trim();
  if (city) params.set("city", city);

  const res = await fetch(apiUrl(`/api/ads/feed-meta?${params}`), {
    credentials: "include",
    signal: options?.signal,
  });

  if (!res.ok) {
    throw new Error(`feed-meta ${res.status}`);
  }

  const data = (await res.json()) as HomeFeedMeta;
  return {
    count: Number(data.count) || 0,
    newestAdId: Number(data.newestAdId) || 0,
    newestCreatedAt: data.newestCreatedAt ?? null,
  };
}
