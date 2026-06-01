/** Home feed only — hide disposable CSRF/location test ads from API (staging DB residue). */

type AdLike = {
  title?: string | null;
  description?: string | null;
};

const HOME_TEST_TITLE_EXACT = new Set([
  "csrf conv ad",
  "loc ad",
  "test ad",
  "csrf t",
  "csrf t2",
  "csrf t3",
  "csrf ai t",
  "csrf ai price title",
  "img csrf t",
]);

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** True for known API verification / CSRF seed listings — not real marketplace ads. */
export function isHomeTestAd(ad: AdLike): boolean {
  const title = norm(ad.title ?? "");
  if (!title) return false;
  if (HOME_TEST_TITLE_EXACT.has(title)) return true;
  if (/^csrf\b/.test(title) && title.length <= 48) return true;
  if (/^img csrf\b/.test(title)) return true;
  if (/^(test|demo|seed|staging)\s+ad\b/.test(title)) return true;
  if (/^p17-prod2\b/.test(title)) return true;
  if (/^(pickup|shipping)\s+e2e$/.test(norm(ad.description ?? ""))) return true;
  const desc = norm(ad.description ?? "");
  if (desc.includes("csrf phase") && title.length <= 32) return true;
  return false;
}

export function filterHomeFeedAds<T extends AdLike>(ads: T[] | undefined | null): T[] {
  if (!Array.isArray(ads)) return [];
  return ads.filter((ad) => !isHomeTestAd(ad));
}
