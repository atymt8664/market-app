/**
 * Phase 7A.4 — STAGING ONLY EXPLAIN for FTS vs ILIKE (read-only).
 */
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { assertStagingRef } from "./_incident_ref_gate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

assertStagingRef(process.env.DATABASE_URL);

const lower = process.env.DATABASE_URL.toLowerCase();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: lower.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

function analyze(planText) {
  return {
    executionTimeMs: Number(planText.match(/Execution Time:\s*([\d.]+)/)?.[1] ?? 0),
    usesSeqScan: /Seq Scan on ads/i.test(planText),
    usesFtsIndex: /ads_search_vector_gin_idx|Bitmap Index Scan.*search_vector/i.test(
      planText,
    ),
    usesTrgm: /ads_city_trgm_idx|gin_trgm_ops/i.test(planText),
    subPlanCount: new Set(planText.match(/SubPlan \d+/g) || []).size,
    snippet: planText.split("\n").slice(0, 14).join("\n"),
  };
}

async function explain(name, sql, params = []) {
  const rows = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`, params);
  const plan = rows.rows.map((r) => r["QUERY PLAN"]).join("\n");
  return { name, ...analyze(plan) };
}

const term = "سيارة";
const city = "Berlin";

const out = {
  phase: "7A.4-explain",
  ref: "qkczposlooaldmsjfmun",
  explains: {},
};

out.explains.legacy_ilike = await explain(
  "legacy_ilike",
  `SELECT id FROM ads WHERE status = 'approved' AND (title ILIKE $1 OR description ILIKE $1) ORDER BY created_at DESC, id DESC LIMIT 20`,
  [`%${term}%`],
);

const tsq = `(
  plainto_tsquery('simple', $1) ||
  plainto_tsquery('english', $1) ||
  plainto_tsquery('german', $1) ||
  plainto_tsquery('arabic', $1)
)`;

out.explains.fts_search = await explain(
  "fts_search",
  `SELECT id FROM ads WHERE status = 'approved' AND search_vector @@ ${tsq}
   ORDER BY ts_rank_cd(search_vector, ${tsq}, 32) DESC, created_at DESC, id DESC LIMIT 20`,
  [term],
);

out.explains.fts_city_trgm = await explain(
  "fts_city_trgm",
  `SELECT id FROM ads WHERE status = 'approved' AND lower(city) % lower($1) ORDER BY created_at DESC LIMIT 20`,
  [city],
);

console.log(JSON.stringify(out, null, 2));
await pool.end();
