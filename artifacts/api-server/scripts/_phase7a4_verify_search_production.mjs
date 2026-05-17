/**
 * Phase 7A.4 — PRODUCTION ONLY read-only FTS verification.
 * REQUIRED: PRODUCTION_DATABASE_URL (never .env.local).
 */
import pg from "pg";
import { assertProductionRef, refFromUrl } from "./_incident_ref_gate.mjs";

const url = process.env.PRODUCTION_DATABASE_URL?.trim();
if (!url) {
  console.log(JSON.stringify({ ok: false, error: "PRODUCTION_DATABASE_URL not set" }));
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
  ssl: lower.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

const out = {
  phase: "7A.4-verify-production",
  ref: refFromUrl(url),
  ok: true,
  checks: {},
};

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

try {
  const col = await q(
    `SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ads' AND column_name = 'search_vector'`,
  );
  out.checks.search_vector_column = Number(col[0]?.c ?? 0) === 1;

  const idx = await q(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ads' AND indexname IN ('ads_search_vector_gin_idx', 'ads_city_trgm_idx')`,
  );
  out.checks.indexes = idx.map((r) => r.indexname).sort();

  const cov = await q(
    `SELECT COUNT(*)::bigint AS total, COUNT(*) FILTER (WHERE search_vector IS NOT NULL)::bigint AS with_vec FROM ads`,
  );
  out.checks.coverage = cov[0];

  const sample = await q(
    `SELECT COUNT(*)::bigint AS c FROM ads WHERE status = 'approved' AND search_vector @@ plainto_tsquery('simple', 'test')`,
  );
  out.checks.sample_fts_query_ok = true;
  out.checks.sample_matches = Number(sample[0]?.c ?? 0);

  if (!out.checks.search_vector_column || out.checks.indexes.length < 2) {
    out.ok = false;
  }
  if (
    Number(out.checks.coverage?.total ?? 0) > 0 &&
    Number(out.checks.coverage?.with_vec ?? 0) !== Number(out.checks.coverage?.total ?? 0)
  ) {
    out.ok = false;
    out.checks.backfill_complete = false;
  } else {
    out.checks.backfill_complete = true;
  }
} catch (e) {
  out.ok = false;
  out.error = String(e.message || e).slice(0, 200);
}

console.log(JSON.stringify(out, null, 2));
await pool.end();
process.exit(out.ok ? 0 : 1);
