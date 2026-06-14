/**
 * P9-E-INCIDENT-1: Home query recovery — feed timeout, settled detection, category failure.
 * Pure helpers (unit-tested); no auth/session changes.
 */

/** Max wait before partial feed reveal (featured settled but recommended pending/failed). */
export const HOME_FEED_REVEAL_TIMEOUT_MS = 8_000;

/** React Query retries for Home public feeds (not auth/me). */
export const HOME_PUBLIC_QUERY_RETRY = 2;

export function isFeaturedQuerySettled(isFetched: boolean, isError: boolean): boolean {
  return isFetched || isError;
}

export function isRecommendedQuerySettled(
  feedCity: string | undefined,
  cityAdsFetched: boolean,
  cityAds: unknown[] | undefined,
  cityAdsError: boolean,
  defaultRecFetched: boolean,
  defaultRecError: boolean,
): boolean {
  if (!feedCity) {
    return defaultRecFetched || defaultRecError;
  }
  if (Array.isArray(cityAds) && cityAds.length > 0 && cityAdsFetched) {
    return true;
  }
  if (cityAdsError && (defaultRecFetched || defaultRecError)) {
    return true;
  }
  return (cityAdsFetched && defaultRecFetched) || defaultRecError;
}

/** Unified feed gate — full ready, or timeout unlock (P9-E-COMPAT-1: pending queries must not block forever). */
export function computeHomeFeedReady(
  featuredSettled: boolean,
  recommendedSettled: boolean,
  feedTimeoutReached: boolean,
): boolean {
  if (featuredSettled && recommendedSettled) {
    return true;
  }
  if (feedTimeoutReached) {
    return true;
  }
  return false;
}

/** Never render an empty category strip — skeleton while loading, fetching, or failed. */
export function shouldShowCategoryPlaceholders(
  categories: unknown[] | undefined,
  isLoading: boolean,
  isFetching: boolean,
  isError: boolean,
): boolean {
  if (Array.isArray(categories)) {
    return false;
  }
  return isLoading || isFetching || isError || categories === undefined;
}

export function categoriesQueryFailed(
  categories: unknown[] | undefined,
  isFetched: boolean,
  isError: boolean,
): boolean {
  return isError || (isFetched && !Array.isArray(categories));
}

export function shouldReserveBellColumn(
  hasUser: boolean,
  bellHint: boolean,
  authLoading: boolean,
  authFetching: boolean,
): boolean {
  return hasUser || bellHint || authLoading || authFetching;
}

export function shouldShowBellSettledShell(
  showLink: boolean,
  bellHint: boolean,
  authLoading: boolean,
  authFetching: boolean,
): boolean {
  return showLink || bellHint || authLoading || authFetching;
}
