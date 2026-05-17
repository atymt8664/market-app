-- =============================================================================
-- Phase 7A.4 — Multilingual ad search (FTS + city trigram) (Souq Arab EU)
-- =============================================================================
--
-- GOAL
--   Replace ILIKE '%term%' scans with GIN-backed full-text search (ar/en/de/simple)
--   and trigram index for city filtering. API flag: USE_FTS_AD_SEARCH=1
--
-- REF GATE (manual)
--   STAGING:  qkczposlooaldmsjfmun
--   PRODUCTION: nptfxtkedqndkgmrcntn — separate approval only
--
-- EXECUTION
--   Manual direct Postgres (Supabase 5432). One statement at a time outside BEGIN.
--   Staging first. Or: node artifacts/api-server/scripts/_phase7a4_execute_staging.mjs
--
-- ROLLBACK
--   DROP TRIGGER IF EXISTS ads_search_vector_trigger ON ads;
--   DROP FUNCTION IF EXISTS ads_search_vector_trigger_fn();
--   DROP FUNCTION IF EXISTS ads_build_search_vector(text, text);
--   DROP INDEX CONCURRENTLY IF EXISTS ads_search_vector_gin_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS ads_city_trgm_idx;
--   ALTER TABLE ads DROP COLUMN IF EXISTS search_vector;
--   (optional) DROP EXTENSION pg_trgm;
--
-- =============================================================================
-- SECTION A — READ-ONLY PRE-FLIGHT
-- =============================================================================

SELECT to_regclass('public.ads') AS ads_regclass;
SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm');

-- =============================================================================
-- SECTION B — EXTENSIONS + COLUMN
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- =============================================================================
-- SECTION C — VECTOR BUILD + TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ads_build_search_vector(p_title text, p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('simple', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_description, '')), 'B') ||
    setweight(to_tsvector('german', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(p_description, '')), 'B') ||
    setweight(to_tsvector('arabic', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('arabic', coalesce(p_description, '')), 'B');
$$;

CREATE OR REPLACE FUNCTION public.ads_search_vector_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := public.ads_build_search_vector(NEW.title, NEW.description);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ads_search_vector_trigger ON public.ads;
CREATE TRIGGER ads_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.ads_search_vector_trigger_fn();

-- =============================================================================
-- SECTION D — BACKFILL (idempotent)
-- =============================================================================

UPDATE public.ads
SET search_vector = public.ads_build_search_vector(title, description)
WHERE search_vector IS NULL
   OR search_vector = ''::tsvector;

-- =============================================================================
-- SECTION E — INDEXES (CONCURRENTLY — one at a time, not in transaction)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_search_vector_gin_idx
  ON public.ads USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_city_trgm_idx
  ON public.ads USING gin (lower(city) gin_trgm_ops);

-- =============================================================================
-- SECTION F — VERIFICATION (read-only)
-- =============================================================================

SELECT COUNT(*)::bigint AS ads_total,
       COUNT(*) FILTER (WHERE search_vector IS NOT NULL)::bigint AS with_vector
FROM public.ads;

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'ads'
  AND indexname IN ('ads_search_vector_gin_idx', 'ads_city_trgm_idx');
