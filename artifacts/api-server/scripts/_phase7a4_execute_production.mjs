/**
 * Phase 7A.4 — PRODUCTION ONLY: FTS migration (014).
 * REQUIRED: PRODUCTION_DATABASE_URL (never .env.local).
 * Ref gate: nptfxtkedqndkgmrcntn only. Does not log secrets.
 */
import pg from "pg";
import { assertProductionRef, refFromUrl } from "./_incident_ref_gate.mjs";

const url = process.env.PRODUCTION_DATABASE_URL?.trim();
if (!url) {
  console.log(
    JSON.stringify({
      ok: false,
      error: "PRODUCTION_DATABASE_URL not set",
    }),
  );
  process.exit(1);
}

try {
  assertProductionRef(url, "PRODUCTION_DATABASE_URL");
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message) }));
  process.exit(1);
}

const lower = url.toLowerCase();
const pool = new pg.Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 120000,
  ssl: lower.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

const steps = [
  {
    name: "extension_pg_trgm",
    sql: `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  },
  {
    name: "add_search_vector_column",
    sql: `ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS search_vector tsvector`,
  },
  {
    name: "fn_build_search_vector",
    sql: `
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
$$`,
  },
  {
    name: "fn_trigger",
    sql: `
CREATE OR REPLACE FUNCTION public.ads_search_vector_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := public.ads_build_search_vector(NEW.title, NEW.description);
  RETURN NEW;
END;
$$`,
  },
  {
    name: "drop_trigger",
    sql: `DROP TRIGGER IF EXISTS ads_search_vector_trigger ON public.ads`,
  },
  {
    name: "create_trigger",
    sql: `
CREATE TRIGGER ads_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.ads_search_vector_trigger_fn()`,
  },
  {
    name: "backfill_search_vector",
    sql: `
UPDATE public.ads
SET search_vector = public.ads_build_search_vector(title, description)
WHERE search_vector IS NULL OR search_vector = ''::tsvector`,
  },
  {
    name: "index_search_vector_gin",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_search_vector_gin_idx ON public.ads USING gin (search_vector)`,
  },
  {
    name: "index_city_trgm",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_city_trgm_idx ON public.ads USING gin (lower(city) gin_trgm_ops)`,
  },
];

const out = {
  phase: "7A.4-execute-production",
  ref: refFromUrl(url),
  startedAt: new Date().toISOString(),
  steps: {},
  ok: true,
};

const client = await pool.connect();
try {
  for (const step of steps) {
    const t0 = Date.now();
    try {
      await client.query(step.sql);
      out.steps[step.name] = { ok: true, ms: Date.now() - t0 };
    } catch (e) {
      out.steps[step.name] = {
        ok: false,
        ms: Date.now() - t0,
        error: String(e.message || e).slice(0, 200),
      };
      out.ok = false;
      break;
    }
  }

  if (out.ok) {
    const verify = await client.query(`
      SELECT
        (SELECT COUNT(*)::bigint FROM ads) AS ads_total,
        (SELECT COUNT(*)::bigint FROM ads WHERE search_vector IS NOT NULL) AS with_vector,
        (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ads' AND indexname = 'ads_search_vector_gin_idx') AS gin_idx,
        (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ads' AND indexname = 'ads_city_trgm_idx') AS city_idx
    `);
    out.verify = verify.rows[0];
  }
} finally {
  client.release();
  await pool.end();
}

out.finishedAt = new Date().toISOString();
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
