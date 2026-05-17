-- =============================================================================
-- Phase 7A.1b — ad_views dedup safety plan (Souq Arab EU)
-- =============================================================================
--
-- PURPOSE
--   Remove duplicate rows in ad_views where the same (ad_id, viewer_key) appears
--   more than once. Keep exactly one row per pair: the row with the smallest id
--   (oldest insert). Required before Phase 7A.1c UNIQUE (ad_id, viewer_key).
--
-- SCOPE — ad_views ONLY
--   • This file must NOT be wired into prepareDatabase() or API startup.
--   • No changes to ads, messages, or any other table.
--   • No CREATE INDEX / UNIQUE in this phase.
--
-- PRE-FLIGHT (production, 2026-05-17 read-only audit — for reference only)
--   • total rows: 151
--   • unique (ad_id, viewer_key) pairs: 16
--   • duplicate groups: 11
--   • rows to delete: 135
--   Re-run Section A on the target DB before executing deletes; numbers may change.
--
-- ROLLBACK — READ CAREFULLY
--   • DELETE is irreversible without a database backup or point-in-time recovery.
--   • Take a Supabase backup / snapshot BEFORE uncommenting any DELETE statement.
--   • There is no SQL "ROLLBACK" for deleted rows after COMMIT.
--   • Optional safety: export duplicate ids first (Section A.5) to a staging table.
--
-- EXECUTION ORDER (manual, direct Postgres session — staging first, then production)
--   1. Run all of Section A (read-only) on staging; confirm counts.
--   2. Backup database.
--   3. On staging: run Section B batch DELETE until 0 rows deleted per batch.
--   4. Run Section C verification; all checks must pass.
--   5. Repeat 2–4 on production in a low-traffic window.
--   6. Proceed to Phase 7A.1c (UNIQUE index) only after verification passes.
--
-- NOTE ON ads.views
--   API increments ads.views when a new ad_views row is inserted (onConflictDoNothing
--   on PK only). Historical duplicates may have inflated ads.views. This dedup does
--   NOT reconcile ads.views — only removes redundant ad_views rows.
--
-- =============================================================================
-- SECTION A — READ-ONLY PREVIEW (safe to run anytime)
-- =============================================================================

-- A.1 Totals snapshot
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs
FROM ad_views;

-- A.2 Duplicate groups and rows that would be deleted
SELECT
  COUNT(*)::bigint AS duplicate_groups,
  COALESCE(SUM(row_count - 1), 0)::bigint AS rows_to_delete
FROM (
  SELECT COUNT(*)::bigint AS row_count
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) > 1
) g;

-- A.3 Rows to KEEP (smallest id per pair) vs rows to DELETE
SELECT
  (SELECT COUNT(*)::bigint FROM (
     SELECT MIN(id) AS keep_id
     FROM ad_views
     GROUP BY ad_id, viewer_key
   ) keepers) AS rows_to_keep,
  (SELECT COUNT(*)::bigint FROM ad_views v
   WHERE NOT EXISTS (
     SELECT 1
     FROM (
       SELECT MIN(id) AS keep_id
       FROM ad_views
       GROUP BY ad_id, viewer_key
     ) k
     WHERE k.keep_id = v.id
   )) AS rows_to_delete;

-- A.4 Top duplicate groups (sample; no viewer_key secrets beyond table data)
SELECT
  ad_id,
  LEFT(viewer_key, 16) AS viewer_key_prefix,
  COUNT(*)::int AS row_count,
  MIN(id) AS keep_id,
  MAX(id) AS max_id,
  ARRAY_AGG(id ORDER BY id) AS all_ids
FROM ad_views
GROUP BY ad_id, viewer_key
HAVING COUNT(*) > 1
ORDER BY row_count DESC, ad_id
LIMIT 20;

-- A.5 Optional: list every id that WOULD be deleted (read-only)
-- SELECT v.id, v.ad_id, v.viewer_key, v.created_at
-- FROM ad_views v
-- INNER JOIN (
--   SELECT ad_id, viewer_key, MIN(id) AS keep_id
--   FROM ad_views
--   GROUP BY ad_id, viewer_key
-- ) k ON k.ad_id = v.ad_id AND k.viewer_key = v.viewer_key
-- WHERE v.id <> k.keep_id
-- ORDER BY v.ad_id, v.viewer_key, v.id;

-- =============================================================================
-- SECTION B — DELETE (DO NOT RUN UNTIL BACKUP + STAGING VALIDATED)
-- =============================================================================
--
-- INSTRUCTIONS
--   • Statements below are COMMENTED OUT intentionally.
--   • Uncomment ONE batch block at a time.
--   • Re-run until the batch reports 0 rows deleted (or use RETURNING count).
--   • Default batch size: 500 duplicate ids per iteration (tune if needed).
--   • Each batch is a single transaction; safe to COMMIT per batch on large tables.
--
-- KEEP RULE: retain MIN(id) for each (ad_id, viewer_key); delete all other ids.
--
-- ---------------------------------------------------------------------------
-- B.1 Single-shot DELETE (small tables only, e.g. current ~135 rows)
-- NOT RECOMMENDED for millions of rows — use B.2 batches instead.
-- ---------------------------------------------------------------------------
--
-- BEGIN;
-- DELETE FROM ad_views AS v
-- USING (
--   SELECT v2.id
--   FROM ad_views v2
--   INNER JOIN (
--     SELECT ad_id, viewer_key, MIN(id) AS keep_id
--     FROM ad_views
--     GROUP BY ad_id, viewer_key
--   ) k ON k.ad_id = v2.ad_id AND k.viewer_key = v2.viewer_key
--   WHERE v2.id <> k.keep_id
-- ) doomed
-- WHERE v.id = doomed.id;
-- -- Inspect: SELECT COUNT(*) FROM ad_views; then COMMIT or ROLLBACK;
-- COMMIT;
--
-- ---------------------------------------------------------------------------
-- B.2 Batch DELETE (recommended for production scale)
-- Repeat: uncomment, run, check rows deleted, repeat until 0.
-- ---------------------------------------------------------------------------
--
-- BEGIN;
-- WITH doomed AS (
--   SELECT v.id
--   FROM ad_views v
--   INNER JOIN (
--     SELECT ad_id, viewer_key, MIN(id) AS keep_id
--     FROM ad_views
--     GROUP BY ad_id, viewer_key
--   ) k ON k.ad_id = v.ad_id AND k.viewer_key = v.viewer_key
--   WHERE v.id <> k.keep_id
--   ORDER BY v.id
--   LIMIT 500
-- )
-- DELETE FROM ad_views
-- WHERE id IN (SELECT id FROM doomed)
-- RETURNING id;
-- COMMIT;
--
-- ---------------------------------------------------------------------------
-- B.3 Alternative batch (CTE + ROW_NUMBER — equivalent keep-MIN-id rule)
-- ---------------------------------------------------------------------------
--
-- BEGIN;
-- WITH ranked AS (
--   SELECT
--     id,
--     ROW_NUMBER() OVER (
--       PARTITION BY ad_id, viewer_key
--       ORDER BY id ASC
--     ) AS rn
--   FROM ad_views
-- ),
-- doomed AS (
--   SELECT id FROM ranked WHERE rn > 1 ORDER BY id LIMIT 500
-- )
-- DELETE FROM ad_views
-- WHERE id IN (SELECT id FROM doomed)
-- RETURNING id;
-- COMMIT;

-- =============================================================================
-- SECTION C — VERIFICATION (run after DELETE; read-only checks)
-- =============================================================================

-- C.1 Must be zero before Phase 7A.1c UNIQUE index
SELECT COUNT(*)::bigint AS duplicate_groups_remaining
FROM (
  SELECT 1
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) > 1
) t;

-- C.2 Extra rows beyond one per pair (must be 0)
SELECT COALESCE(SUM(c - 1), 0)::bigint AS duplicate_rows_remaining
FROM (
  SELECT COUNT(*)::bigint AS c
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) > 1
) d;

-- C.3 Post-dedup totals (compare to Section A.1 before/after)
SELECT
  COUNT(*)::bigint AS total_rows_after,
  COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs_after
FROM ad_views;

-- C.4 Sanity: every pair has exactly one row and it is the minimum id
SELECT COUNT(*)::bigint AS pairs_where_min_id_is_not_sole_row
FROM (
  SELECT ad_id, viewer_key
  FROM ad_views
  GROUP BY ad_id, viewer_key
  HAVING COUNT(*) <> 1 OR MIN(id) <> MAX(id)
) bad;
-- Expected: 0

-- C.5 Ready for UNIQUE index (informational; do not create index in this file)
-- SELECT
--   (SELECT COUNT(*) FROM ad_views) = (SELECT COUNT(DISTINCT (ad_id, viewer_key)) FROM ad_views)
--   AS ready_for_unique_on_ad_id_viewer_key;
