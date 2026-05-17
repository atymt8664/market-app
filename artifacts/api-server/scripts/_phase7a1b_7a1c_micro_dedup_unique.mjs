/**
 * Phase 7A.1b micro-dedup + 7A.1c UNIQUE on ad_views only.
 * No API changes. No secrets in stdout.
 */
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const INDEX_NAME = "ad_views_ad_viewer_unique";
const CREATE_UNIQUE_SQL = `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ${INDEX_NAME} ON public.ad_views (ad_id, viewer_key)`;

if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, error: "DATABASE_URL not configured" }));
  process.exit(1);
}

const useSsl =
  DATABASE_URL.toLowerCase().includes("supabase.co") ||
  DATABASE_URL.toLowerCase().includes("sslmode=require") ||
  process.env.PGSSLMODE === "require";

function safeHostHint(url) {
  try {
    const u = new URL(url.replace(/^postgres:/, "http:"));
    return { hostname: u.hostname, port: u.port || "5432", pooler: u.hostname.includes("pooler") };
  } catch {
    return { hostname: "configured", port: "?", pooler: null };
  }
}

async function metrics(client) {
  const a1 = await client.query(`
    SELECT COUNT(*)::bigint AS total_rows, COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs,
           (COUNT(*) = COUNT(DISTINCT (ad_id, viewer_key))) AS total_equals_unique
    FROM ad_views`);
  const a2 = await client.query(`
    SELECT COUNT(*)::bigint AS duplicate_groups, COALESCE(SUM(row_count - 1), 0)::bigint AS duplicate_rows_remaining
    FROM (SELECT COUNT(*)::bigint AS row_count FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1) g`);
  return {
    total_rows: Number(a1.rows[0].total_rows),
    unique_pairs: Number(a1.rows[0].unique_pairs),
    total_equals_unique: a1.rows[0].total_equals_unique === true,
    duplicate_groups: Number(a2.rows[0].duplicate_groups),
    duplicate_rows_remaining: Number(a2.rows[0].duplicate_rows_remaining),
  };
}

async function duplicateSample(client) {
  const r = await client.query(`
    SELECT ad_id, LEFT(viewer_key, 20) AS viewer_key_prefix, COUNT(*)::int AS row_count,
           MIN(id) AS keep_id, ARRAY_AGG(id ORDER BY id) AS all_ids
    FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1
    ORDER BY row_count DESC LIMIT 10`);
  return r.rows;
}

async function indexStatus(client) {
  const r = await client.query(`
    SELECT c.relname AS index_name, ix.indisunique AS is_unique, ix.indisvalid AS is_valid,
           pg_get_indexdef(ix.indexrelid) AS index_def
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index ix ON ix.indexrelid = c.oid
    WHERE n.nspname = 'public' AND c.relname = $1`, [INDEX_NAME]);
  return r.rows[0] ?? null;
}

function dedupClean(m) {
  return m.duplicate_groups === 0 && m.duplicate_rows_remaining === 0 && m.total_equals_unique;
}

async function deleteDuplicates(client) {
  const r = await client.query(`
    WITH doomed AS (
      SELECT v.id FROM ad_views v
      INNER JOIN (
        SELECT ad_id, viewer_key, MIN(id) AS keep_id FROM ad_views GROUP BY ad_id, viewer_key
      ) k ON k.ad_id = v.ad_id AND k.viewer_key = v.viewer_key
      WHERE v.id <> k.keep_id
    )
    DELETE FROM ad_views WHERE id IN (SELECT id FROM doomed)
    RETURNING id`);
  return { deleted: r.rowCount ?? r.rows.length, ids: r.rows.map((x) => x.id) };
}

async function main() {
  const report = {
    ok: false,
    phase: "7A.1b-micro + 7A.1c",
    hostHint: safeHostHint(DATABASE_URL),
    executedAt: new Date().toISOString(),
    preCheckBeforeDedup: null,
    duplicateSampleBefore: null,
    microDedup: null,
    afterDedup: null,
    uniqueIndex: null,
    afterUnique: null,
    readyForApiFix: false,
  };

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  report.preCheckBeforeDedup = await metrics(client);
  report.duplicateSampleBefore = await duplicateSample(client);

  if (report.preCheckBeforeDedup.duplicate_groups === 0) {
    report.microDedup = { skipped: true, deleted: 0, reason: "already_clean" };
  } else {
    const del = await deleteDuplicates(client);
    report.microDedup = { skipped: false, deleted: del.deleted, deletedIds: del.ids };
  }

  report.afterDedup = await metrics(client);
  if (!dedupClean(report.afterDedup)) {
    report.uniqueIndex = { skipped: true, reason: "dedup_verification_failed" };
    await client.end();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const existing = await indexStatus(client);
  if (existing?.is_valid === true && existing?.is_unique === true) {
    report.uniqueIndex = { created: false, alreadyExisted: true, index: existing };
  } else {
    if (existing && existing.is_valid === false) {
      await client.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${INDEX_NAME}`);
    }
    try {
      await client.query(CREATE_UNIQUE_SQL);
      const idx = await indexStatus(client);
      report.uniqueIndex = { created: true, alreadyExisted: false, index: idx, error: null };
    } catch (e) {
      report.uniqueIndex = { created: false, error: String(e.message || e).slice(0, 500) };
      if ((await indexStatus(client))?.is_valid === false) {
        await client.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${INDEX_NAME}`).catch(() => {});
      }
      await client.end();
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
  }

  report.afterUnique = {
    metrics: await metrics(client),
    index: await indexStatus(client),
  };

  const idx = report.afterUnique.index;
  report.ok =
    dedupClean(report.afterUnique.metrics) &&
    idx?.is_valid === true &&
    idx?.is_unique === true;

  report.readyForApiFix = report.ok;

  await client.end();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
