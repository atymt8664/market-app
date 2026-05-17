/**
 * Phase 7A.1c — ad_views UNIQUE index execution. DDL only, no DML.
 */
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const INDEX_NAME = "ad_views_ad_viewer_unique";
const CREATE_SQL = `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ${INDEX_NAME} ON public.ad_views (ad_id, viewer_key)`;

if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, error: "DATABASE_URL not configured" }));
  process.exit(1);
}

const lower = DATABASE_URL.toLowerCase();
const useSsl =
  lower.includes("supabase.co") ||
  lower.includes("sslmode=require") ||
  process.env.PGSSLMODE === "require";

function safeHostHint(url) {
  try {
    const u = new URL(url.replace(/^postgres:/, "http:"));
    return { hostname: u.hostname, port: u.port || "5432", pooler: u.hostname.includes("pooler") };
  } catch {
    return { hostname: "configured", port: "?", pooler: null };
  }
}

async function preCheck(client) {
  const a1 = await client.query(`
    SELECT COUNT(*)::bigint AS total_rows, COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs,
           (COUNT(*) = COUNT(DISTINCT (ad_id, viewer_key))) AS ready_for_unique
    FROM ad_views`);
  const a2 = await client.query(`
    SELECT COUNT(*)::bigint AS duplicate_groups FROM (
      SELECT 1 FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1) t`);
  const a3 = await client.query(`
    SELECT COALESCE(SUM(c - 1), 0)::bigint AS duplicate_rows_remaining FROM (
      SELECT COUNT(*)::bigint AS c FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1) d`);
  const a4 = await client.query(`
    SELECT c.relname AS index_name, ix.indisunique AS is_unique, ix.indisvalid AS is_valid,
           pg_get_indexdef(ix.indexrelid) AS index_def
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index ix ON ix.indexrelid = c.oid
    WHERE n.nspname = 'public' AND c.relname = $1`, [INDEX_NAME]);
  return {
    total_rows: Number(a1.rows[0].total_rows),
    unique_pairs: Number(a1.rows[0].unique_pairs),
    ready_for_unique: a1.rows[0].ready_for_unique === true,
    duplicate_groups: Number(a2.rows[0].duplicate_groups),
    duplicate_rows_remaining: Number(a3.rows[0].duplicate_rows_remaining),
    existingIndex: a4.rows[0] ?? null,
  };
}

async function indexRow(client) {
  const r = await client.query(`
    SELECT c.relname AS index_name, ix.indisunique AS is_unique, ix.indisvalid AS is_valid,
           pg_get_indexdef(ix.indexrelid) AS index_def
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index ix ON ix.indexrelid = c.oid
    WHERE n.nspname = 'public' AND c.relname = $1`, [INDEX_NAME]);
  return r.rows[0] ?? null;
}

function preChecksPass(pc) {
  return (
    pc.duplicate_groups === 0 &&
    pc.duplicate_rows_remaining === 0 &&
    pc.ready_for_unique &&
    pc.total_rows === pc.unique_pairs
  );
}

async function main() {
  const report = {
    ok: false,
    phase: "7A.1c",
    hostHint: safeHostHint(DATABASE_URL),
    executedAt: new Date().toISOString(),
    preCheck: null,
    preChecksPass: false,
    createExecuted: false,
    createError: null,
    indexAfter: null,
    verification: null,
  };

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  report.preCheck = await preCheck(client);
  report.preChecksPass = preChecksPass(report.preCheck);

  if (!report.preChecksPass) {
    report.createError = "pre_checks_failed_stop";
    await client.end();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const existing = report.preCheck.existingIndex;
  if (existing?.is_valid === true && existing?.is_unique === true) {
    report.createExecuted = false;
    report.indexAfter = existing;
  } else {
    if (existing && existing.is_valid === false) {
      await client.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${INDEX_NAME}`);
    }
    try {
      await client.query(CREATE_SQL);
      report.createExecuted = true;
    } catch (e) {
      report.createError = String(e.message || e).slice(0, 500);
      const inv = await indexRow(client);
      if (inv && inv.is_valid === false) {
        await client.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${INDEX_NAME}`).catch(() => {});
      }
      await client.end();
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
    report.indexAfter = await indexRow(client);
  }

  const post = await preCheck(client);
  report.verification = {
    duplicate_groups_remaining: post.duplicate_groups,
    duplicate_rows_remaining: post.duplicate_rows_remaining,
    total_rows: post.total_rows,
    unique_pairs: post.unique_pairs,
    index: report.indexAfter,
  };

  report.ok =
    report.indexAfter?.is_valid === true &&
    report.indexAfter?.is_unique === true &&
    post.duplicate_groups === 0 &&
    post.duplicate_rows_remaining === 0;

  await client.end();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
