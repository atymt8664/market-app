/**
 * Shared React Query stale windows (Phase 7B).
 * Aligns with home feed tuning (7A.6) — invalidate* after mutations still refreshes when needed.
 */

/** Taxonomy (categories / subcategories) — rarely changes server-side. */
export const STALE_CATEGORIES_MS = 10 * 60 * 1000;

/** Public ad listings (market, search, user ads grid). */
export const STALE_AD_LIST_MS = 90 * 1000;

/** Single ad detail — fresh enough for engagement; avoids refetch on back navigation. */
export const STALE_AD_DETAIL_MS = 2 * 60 * 1000;

/** Authenticated user lists (my ads, favorites). */
export const STALE_USER_ADS_MS = 60 * 1000;

/** Inbox list — balance realtime (WS) vs navigation churn. */
export const STALE_CONVERSATIONS_MS = 20 * 1000;

/** Notification unread badge. */
export const STALE_UNREAD_NOTIFICATIONS_MS = 30 * 1000;

/** Peer block / moderation status in chat. */
export const STALE_PEER_BLOCK_MS = 30 * 1000;

/** Thread messages list — matches message-thread React Query tuning. */
export const STALE_THREAD_MESSAGES_MS = 60 * 1000;

/** Thread messages cache retention. */
export const GC_THREAD_MESSAGES_MS = 30 * 60 * 1000;
