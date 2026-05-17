/**
 * Phase 7A.3c — STAGING ONLY read-only counter drift verification.
 * Does not print DATABASE_URL or secrets.
 *
 * Usage: node artifacts/api-server/scripts/_phase7a3c_verify_counters_readonly.mjs
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

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

const out = {
  phase: "7A.3c-verify",
  ref: "qkczposlooaldmsjfmun",
  auditedAt: new Date().toISOString(),
  tableExists: null,
  adsMissingCounter: null,
  likeDriftRows: null,
  favoriteDriftRows: null,
  negativeRows: null,
  ok: true,
};

try {
  const reg = await q(
    `SELECT to_regclass('public.ad_reaction_counts') AS reg`,
  );
  out.tableExists = reg[0]?.reg != null;
  if (!out.tableExists) {
    out.ok = false;
    out.error = "ad_reaction_counts not present — run 013 migration first";
  } else {
    const missing = await q(`
      SELECT COUNT(*)::bigint AS c FROM ads a
      WHERE NOT EXISTS (SELECT 1 FROM ad_reaction_counts c WHERE c.ad_id = a.id)
    `);
    out.adsMissingCounter = Number(missing[0]?.c ?? 0);

    const likeDrift = await q(`
      SELECT COUNT(*)::bigint AS c
      FROM ad_reaction_counts rc
      JOIN (
        SELECT ad_id, COUNT(*)::int AS actual FROM ad_likes GROUP BY ad_id
      ) l ON l.ad_id = rc.ad_id
      WHERE rc.like_count <> l.actual
    `);
    out.likeDriftRows = Number(likeDrift[0]?.c ?? 0);

    const favDrift = await q(`
      SELECT COUNT(*)::bigint AS c
      FROM ad_reaction_counts rc
      JOIN (
        SELECT ad_id, COUNT(*)::int AS actual FROM ad_favorites GROUP BY ad_id
      ) f ON f.ad_id = rc.ad_id
      WHERE rc.favorite_count <> f.actual
    `);
    out.favoriteDriftRows = Number(favDrift[0]?.c ?? 0);

    const neg = await q(`
      SELECT COUNT(*)::bigint AS c FROM ad_reaction_counts
      WHERE like_count < 0 OR favorite_count < 0
    `);
    out.negativeRows = Number(neg[0]?.c ?? 0);

    if (
      out.adsMissingCounter > 0 ||
      out.likeDriftRows > 0 ||
      out.favoriteDriftRows > 0 ||
      out.negativeRows > 0
    ) {
      out.ok = false;
    }
  }
} catch (e) {
  out.ok = false;
  out.error = String(e.message || e);
}

console.log(JSON.stringify(out, null, 2));
await pool.end();
process.exit(out.ok ? 0 : 1);
