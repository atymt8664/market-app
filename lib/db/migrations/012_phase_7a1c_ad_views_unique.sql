-- =============================================================================
-- Phase 7A.1c — ad_views UNIQUE (ad_id, viewer_key) (Souq Arab EU)
-- =============================================================================
--
-- PURPOSE
--   Enforce one view record per (ad_id, viewer_key) at the database layer.
--   Prerequisite: Phase 7A.1b dedup completed with zero duplicates remaining.
--
-- SCOPE — ad_views ONLY
--   • This file must NOT be wired into prepareDatabase() or API startup.
--   • No DELETE / UPDATE / INSERT in this file.
--   • No API or application code changes in this phase.
--   • Updating insert().onConflictDoNothing() to target (ad_id, viewer_key) is a
--     separate follow-up after this index exists and is verified in production.
--
-- HARD GATE — DO NOT RUN SECTION B UNLESS ALL ARE TRUE
--   • Phase 7A.1b Section C verification passed on this database.
--   • duplicate_groups = 0        (Section A.2)
--   • duplicate_rows_remaining = 0 (Section A.3)
--   • total_rows = unique_pairs   (Section A.1)
--   If any check fails, STOP and complete 011_phase_7a1b_ad_views_dedup.sql first.
--   CREATE UNIQUE INDEX will FAIL or enter INVALID state if duplicates remain.
--
-- EXECUTION (manual, direct Postgres session — staging first, then production)
--   • Use Supabase direct connection (port 5432), not transaction-pooler mode for DDL.
--   • Run Section A (read-only) immediately before Section B.
--   • Section B is exactly ONE statement — do not wrap in BEGIN/COMMIT.
--   • CONCURRENTLY cannot run inside a transaction block.
--   • Prefer a low-traffic window; monitor pg_stat_progress_create_index.
--
-- ROLLBACK (manual, one statement, outside a transaction):
--   DROP INDEX CONCURRENTLY IF EXISTS public.ad_views_ad_viewer_unique;
--
-- RELATION TO 7A.1a
--   ad_views_ad_id_idx (non-unique on ad_id) may coexist; this UNIQUE also supports
--   ad_id-leading lookups. Dropping ad_views_ad_id_idx later is optional, not required.
--
-- =============================================================================
-- SECTION A — READ-ONLY PRE-FLIGHT (run before Section B)
-- =============================================================================

-- A.1 Totals: must satisfy total_rows = unique_pairs
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs,
  (COUNT(*) = COUNT(DISTINCT (ad_id, viewer_key))) AS ready_for_unique
FROM ad_views;

-- A.2 Duplicate groups — MUST be 0 before Section B
SELECT COUNT(*)::bigint AS duplicate_groups
FROM (
  SELECT 1
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) > 1
) t;

-- A.3 Duplicate rows beyond one per pair — MUST be 0 before Section B
SELECT COALESCE(SUM(c - 1), 0)::bigint AS duplicate_rows_remaining
FROM (
  SELECT COUNT(*)::bigint AS c
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) > 1
) d;

-- A.4 Is the target index already present?
SELECT
  i.relname AS index_name,
  ix.indisunique AS is_unique,
  ix.indisvalid AS is_valid,
  pg_get_indexdef(ix.indexrelid) AS index_def
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN pg_index ix ON ix.indrelid = t.oid
LEFT JOIN pg_class i ON i.oid = ix.indexrelid
WHERE n.nspname = 'public'
  AND t.relname = 'ad_views'
  AND i.relname = 'ad_views_ad_viewer_unique';

-- A.5 All indexes on ad_views (context)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'ad_views'
ORDER BY indexname;

-- =============================================================================
-- SECTION B — CREATE UNIQUE INDEX (ONE statement only; run after Section A passes)
-- =============================================================================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ad_views_ad_viewer_unique
  ON public.ad_views (ad_id, viewer_key);

-- =============================================================================
-- SECTION C — VERIFICATION (read-only; run after Section B completes)
-- =============================================================================

-- C.1 Duplicates must still be zero
SELECT COUNT(*)::bigint AS duplicate_groups_remaining
FROM (
  SELECT 1
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) > 1
) t;

-- C.2 Index exists, is UNIQUE, and is VALID (indisvalid = true)
SELECT
  c.relname AS table_name,
  i.relname AS index_name,
  ix.indisunique AS is_unique,
  ix.indisvalid AS is_valid,
  pg_get_indexdef(ix.indexrelid) AS index_def
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_index ix ON ix.indrelid = c.oid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE n.nspname = 'public'
  AND c.relname = 'ad_views'
  AND i.relname = 'ad_views_ad_viewer_unique';

-- C.3 Row count still equals distinct pairs
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs
FROM ad_views;

-- C.4 Future API behavior (informational — NOT executed here)
-- After a follow-up API change, inserts should use ON CONFLICT on (ad_id, viewer_key)
-- so duplicate view attempts do not error and do not inflate ads.views.
-- Until then, onConflictDoNothing() on PK only does not use this index for conflicts.
-- Test in staging after API update:
--   INSERT INTO ad_views (ad_id, viewer_key) VALUES ($1, $2)
--   ON CONFLICT (ad_id, viewer_key) DO NOTHING;
