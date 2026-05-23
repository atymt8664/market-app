-- =============================================================================
-- Phase 7A.3c — Denormalized reaction counters (Souq Arab EU)
-- =============================================================================
--
-- ARCHITECTURE DECISION
--   Store counters in ad_reaction_counts (1:1 sidecar), NOT columns on ads.
--   Rationale: isolates hot write rows from ads metadata/listing scans; same
--   pattern as large marketplaces (entity + counter shard); enables repair and
--   future cache/replica strategies without widening ads heap tuples.
--
-- SOURCE OF TRUTH
--   ad_likes / ad_favorites remain authoritative for membership (isLiked etc.).
--   like_count / favorite_count here are derived aggregates (eventually consistent
--   via transactional increments; repairable via Section D).
--
-- EXECUTION ORDER (MANUAL ONLY — NEVER via API boot)
--   1. STAGING ref qkczposlooaldmsjfmun — Section A → B → C → D
--   2. Verify staging 24–48h (API flag off, then on)
--   3. PRODUCTION ref nptfxtkedqndkgmrcntn — only after explicit approval
--   4. API deploy with USE_DENORMALIZED_REACTION_COUNTERS=1 after backfill verified
--
-- REF GATE (required before any section except A on unknown DB)
--   SELECT current_database(); -- sanity
--   Confirm Supabase project ref in connection matches target environment.
--   STAGING:  qkczposlooaldmsjfmun
--   PRODUCTION: nptfxtkedqndkgmrcntn
--   STOP if mismatch.
--
-- ROLLBACK (manual, reverse order, outside transactions):
--   ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_reaction_counts_fk; -- n/a if only sidecar
--   DROP TABLE IF EXISTS ad_reaction_counts;
--   (API) set USE_DENORMALIZED_REACTION_COUNTERS=0 — restores 7A.3a GROUP BY reads
--
-- =============================================================================
-- SECTION A — READ-ONLY PRE-FLIGHT
-- =============================================================================

-- A.1 Table must not exist yet
SELECT to_regclass('public.ad_reaction_counts') AS reaction_counts_regclass;
-- Expected before B: NULL

-- A.2 Baseline drift check (pre-migration; informational)
SELECT
  (SELECT COUNT(*)::bigint FROM ads) AS ads_total,
  (SELECT COUNT(*)::bigint FROM ad_likes) AS likes_total,
  (SELECT COUNT(*)::bigint FROM ad_favorites) AS favorites_total;

-- A.3 Sample per-ad actual counts (top 10 by likes)
SELECT l.ad_id, COUNT(*)::int AS actual_likes
FROM ad_likes l
GROUP BY l.ad_id
ORDER BY actual_likes DESC
LIMIT 10;

-- =============================================================================
-- SECTION B — DDL (one statement at a time; NOT inside BEGIN/COMMIT)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ad_reaction_counts (
  ad_id integer PRIMARY KEY REFERENCES public.ads(id) ON DELETE CASCADE,
  like_count integer NOT NULL DEFAULT 0,
  favorite_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_reaction_counts_like_nonneg CHECK (like_count >= 0),
  CONSTRAINT ad_reaction_counts_favorite_nonneg CHECK (favorite_count >= 0)
);

-- Optional: index only if batch repair scans by updated_at (defer until needed)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_reaction_counts_updated_at_idx
--   ON public.ad_reaction_counts (updated_at DESC);

-- =============================================================================
-- SECTION C — BACKFILL (idempotent; run on staging first)
-- =============================================================================

-- C.1 Seed missing rows for all ads (zeros)
INSERT INTO public.ad_reaction_counts (ad_id, like_count, favorite_count)
SELECT a.id, 0, 0
FROM public.ads a
WHERE NOT EXISTS (
  SELECT 1 FROM public.ad_reaction_counts c WHERE c.ad_id = a.id
);

-- C.2 Set like_count from ad_likes
WITH agg AS (
  SELECT ad_id, COUNT(*)::int AS c
  FROM public.ad_likes
  GROUP BY ad_id
)
UPDATE public.ad_reaction_counts c
SET like_count = agg.c, updated_at = now()
FROM agg
WHERE c.ad_id = agg.ad_id;

-- C.3 Set favorite_count from ad_favorites
WITH agg AS (
  SELECT ad_id, COUNT(*)::int AS c
  FROM public.ad_favorites
  GROUP BY ad_id
)
UPDATE public.ad_reaction_counts c
SET favorite_count = agg.c, updated_at = now()
FROM agg
WHERE c.ad_id = agg.ad_id;

-- =============================================================================
-- SECTION D — VERIFICATION (read-only)
-- =============================================================================

-- D.1 Row coverage: every ad has a counter row
SELECT COUNT(*)::bigint AS ads_missing_counter
FROM public.ads a
WHERE NOT EXISTS (
  SELECT 1 FROM public.ad_reaction_counts c WHERE c.ad_id = a.id
);
-- Expected: 0

-- D.2 Drift: like_count mismatch
SELECT COUNT(*)::bigint AS like_drift_rows
FROM public.ad_reaction_counts c
JOIN (
  SELECT ad_id, COUNT(*)::int AS actual
  FROM public.ad_likes
  GROUP BY ad_id
) l ON l.ad_id = c.ad_id
WHERE c.like_count <> l.actual;
-- Expected: 0

-- D.3 Drift: ads with likes but counter still 0 (orphan detection)
SELECT COUNT(*)::bigint AS likes_orphan_drift
FROM (
  SELECT l.ad_id, COUNT(*)::int AS actual
  FROM public.ad_likes l
  GROUP BY l.ad_id
) l
LEFT JOIN public.ad_reaction_counts c ON c.ad_id = l.ad_id
WHERE c.ad_id IS NULL OR c.like_count <> l.actual;

-- D.4 Same for favorites
SELECT COUNT(*)::bigint AS favorite_drift_rows
FROM public.ad_reaction_counts c
JOIN (
  SELECT ad_id, COUNT(*)::int AS actual
  FROM public.ad_favorites
  GROUP BY ad_id
) f ON f.ad_id = c.ad_id
WHERE c.favorite_count <> f.actual;

-- D.5 Negative guard (should return 0 rows)
SELECT ad_id, like_count, favorite_count
FROM public.ad_reaction_counts
WHERE like_count < 0 OR favorite_count < 0;

-- =============================================================================
-- SECTION E — REPAIR (run only if D shows drift; manual)
-- =============================================================================

-- E.1 Full reconcile like_count for one ad ($1 = ad_id)
-- UPDATE public.ad_reaction_counts c
-- SET like_count = COALESCE((
--   SELECT COUNT(*)::int FROM public.ad_likes l WHERE l.ad_id = c.ad_id
-- ), 0), updated_at = now()
-- WHERE c.ad_id = $1;

-- E.2 Full reconcile all ads (maintenance window; can be heavy at scale)
-- UPDATE public.ad_reaction_counts c
-- SET
--   like_count = COALESCE(l.c, 0),
--   favorite_count = COALESCE(f.c, 0),
--   updated_at = now()
-- FROM public.ad_reaction_counts c2
-- LEFT JOIN (
--   SELECT ad_id, COUNT(*)::int AS c FROM public.ad_likes GROUP BY ad_id
-- ) l ON l.ad_id = c2.ad_id
-- LEFT JOIN (
--   SELECT ad_id, COUNT(*)::int AS c FROM public.ad_favorites GROUP BY ad_id
-- ) f ON f.ad_id = c2.ad_id
-- WHERE c.ad_id = c2.ad_id;
