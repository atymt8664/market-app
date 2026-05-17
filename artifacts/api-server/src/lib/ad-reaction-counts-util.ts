/** Pure helpers (no DB) — unit-testable. */

export function clampCounter(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export function counterMapsFromRows(
  rows: { adId: number; likeCount: number; favoriteCount: number }[],
): {
  likeCountByAdId: Map<number, number>;
  favoriteCountByAdId: Map<number, number>;
} {
  const likeCountByAdId = new Map<number, number>();
  const favoriteCountByAdId = new Map<number, number>();
  for (const r of rows) {
    likeCountByAdId.set(r.adId, Number(r.likeCount ?? 0));
    favoriteCountByAdId.set(r.adId, Number(r.favoriteCount ?? 0));
  }
  return { likeCountByAdId, favoriteCountByAdId };
}
