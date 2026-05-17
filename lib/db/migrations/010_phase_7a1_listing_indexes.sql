-- =============================================================================
-- Phase 7A.1a — Safe listing indexes (Souq Arab EU)
-- =============================================================================
--
-- PURPOSE
--   Non-unique btree indexes for high-traffic read paths: home feed, featured,
--   category listings, mine, favorites, inbox, message threads, ad view lookups.
--
-- EXECUTION (production / staging) — MANUAL ONLY
--   • Run outside any transaction (CONCURRENTLY is not allowed inside BEGIN/COMMIT).
--   • Use a direct Postgres session (Supabase SQL editor or psql), not API boot.
--   • Do NOT wire this file into prepareDatabase() or Railway startup DDL.
--   • Execute ONE statement below at a time; wait for each to finish before the next.
--   • Prefer low-traffic windows on large tables; monitor pg_stat_progress_create_index.
--
-- SCOPE
--   • CREATE INDEX CONCURRENTLY IF NOT EXISTS only (no UNIQUE, no DML).
--   • ad_views UNIQUE (ad_id, viewer_key) is Phase 7A.1c after dedup — not here.
--
-- ROLLBACK (manual, one statement at a time, also outside a transaction):
--   DROP INDEX CONCURRENTLY IF EXISTS ads_status_created_at_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS ads_featured_status_created_at_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS ads_user_id_created_at_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS ads_category_status_created_at_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS ad_favorites_user_id_created_at_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS messages_conversation_created_at_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS messages_conv_unread_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS conversations_buyer_last_msg_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS conversations_seller_last_msg_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS ad_views_ad_id_idx;
--
-- =============================================================================

-- GET /ads/recommended, public listings by status + newest first
CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_status_created_at_idx
  ON ads (status, created_at DESC);

-- GET /ads/featured — partial matches PUBLIC_AD_STATUSES (approved) + featured
CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_featured_status_created_at_idx
  ON ads (created_at DESC)
  WHERE featured = true AND status = 'approved';

-- GET /ads/mine — seller's ads ordered by created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_user_id_created_at_idx
  ON ads (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- GET /ads?categoryId — category feed + status filter + sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_category_status_created_at_idx
  ON ads (category_id, status, created_at DESC);

-- GET /ads/favorites — user's favorites list ordered by when favorited
CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_favorites_user_id_created_at_idx
  ON ad_favorites (user_id, created_at DESC);

-- Message thread: messages for one conversation, chronological
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_conversation_created_at_idx
  ON messages (conversation_id, created_at ASC);

-- Inbox unread subquery: unread messages per conversation (excluding sender)
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_conv_unread_idx
  ON messages (conversation_id, sender_id)
  WHERE read_at IS NULL;

-- Inbox: conversations where user is buyer, sorted by last activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_buyer_last_msg_idx
  ON conversations (buyer_id, last_message_at DESC);

-- Inbox: conversations where user is seller, sorted by last activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_seller_last_msg_idx
  ON conversations (seller_id, last_message_at DESC);

-- ad_views lookups and future dedup prep by ad_id (non-unique until 7A.1c)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_views_ad_id_idx
  ON ad_views (ad_id);
