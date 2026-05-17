/**
 * Phase 7A.1 pre-flight — READ ONLY. No DDL/DML.
 * Does not log DATABASE_URL or secrets.
 */
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, error: "DATABASE_URL not configured locally" }));
  process.exit(1);
}

const lower = DATABASE_URL.toLowerCase();
const useSsl =
  lower.includes("supabase.co") ||
  lower.includes("sslmode=require") ||
  process.env.PGSSLMODE === "require";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 20000,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

/** Mask host for report — no credentials */
function safeHostHint(url) {
  try {
    const u = new URL(url.replace(/^postgres:/, "http:"));
    return u.hostname.replace(/^db\./, "db.***.") || "configured";
  } catch {
    return "configured";
  }
}

async function q(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows;
}

async function main() {
  const out = {
    ok: true,
    auditedAt: new Date().toISOString(),
    hostHint: safeHostHint(DATABASE_URL),
    pgVersion: null,
    tableSizes: {},
    adViewsDuplicates: {},
    existingIndexes: {},
    explains: {},
    sampleIds: {},
  };

  const ver = await q(`SELECT version() AS v`);
  out.pgVersion = (ver[0]?.v || "").split(" ")[0] + " " + (ver[0]?.v || "").slice(0, 80);

  const tables = [
    "ads",
    "messages",
    "conversations",
    "ad_views",
    "ad_favorites",
    "ad_likes",
    "notifications",
  ];

  const sizeRows = await q(`
    SELECT c.relname AS table_name,
           COALESCE(s.n_live_tup, 0)::bigint AS live_rows_estimate,
           pg_total_relation_size(c.oid)::bigint AS total_bytes,
           pg_relation_size(c.oid)::bigint AS table_bytes,
           pg_indexes_size(c.oid)::bigint AS indexes_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY($1::text[])
    ORDER BY c.relname
  `, [tables]);

  for (const row of sizeRows) {
    out.tableSizes[row.table_name] = {
      liveRowsEstimate: Number(row.live_rows_estimate),
      totalBytes: Number(row.total_bytes),
      tableBytes: Number(row.table_bytes),
      indexesBytes: Number(row.indexes_bytes),
    };
  }
  for (const t of tables) {
    const cr = await q(`SELECT COUNT(*)::bigint AS c FROM ${t}`);
    out.tableSizes[t].exactRowCount = Number(cr[0]?.c ?? 0);
  }

  const dup = await q(`
    SELECT COUNT(*)::bigint AS duplicate_groups
    FROM (
      SELECT 1 FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1
    ) t
  `);
  const dupExtra = await q(`
    SELECT COALESCE(SUM(c - 1), 0)::bigint AS duplicate_rows_to_remove
    FROM (
      SELECT COUNT(*)::bigint AS c FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1
    ) d
  `);
  const adViewsTotal = await q(`SELECT COUNT(*)::bigint AS total FROM ad_views`);
  const uniquePairs = await q(`
    SELECT COUNT(*)::bigint AS c FROM (
      SELECT DISTINCT ad_id, viewer_key FROM ad_views
    ) t
  `);
  const topDup = await q(`
    SELECT ad_id, viewer_key, COUNT(*)::int AS row_count
    FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1
    ORDER BY row_count DESC LIMIT 5
  `);
  out.adViewsDuplicates = {
    totalRows: Number(adViewsTotal[0]?.total ?? 0),
    uniquePairs: Number(uniquePairs[0]?.c ?? 0),
    duplicateGroups: Number(dup[0]?.duplicate_groups ?? 0),
    duplicateRowsToRemove: Number(dupExtra[0]?.duplicate_rows_to_remove ?? 0),
    topDuplicateSamples: topDup.map((r) => ({
      adId: r.ad_id,
      viewerKeyPrefix: String(r.viewer_key).slice(0, 12) + "…",
      rowCount: r.row_count,
    })),
  };

  const idxRows = await q(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
    ORDER BY tablename, indexname
  `, [tables]);

  for (const row of idxRows) {
    const t = row.tablename;
    if (!out.existingIndexes[t]) out.existingIndexes[t] = [];
    out.existingIndexes[t].push({
      name: row.indexname,
      def: row.indexdef,
    });
  }

  const samples = await q(`
    SELECT
      (SELECT id FROM ads WHERE status = 'approved' ORDER BY created_at DESC LIMIT 1) AS ad_id,
      (SELECT category_id FROM ads WHERE status = 'approved' AND category_id IS NOT NULL LIMIT 1) AS category_id,
      (SELECT user_id FROM ads WHERE user_id IS NOT NULL ORDER BY created_at DESC LIMIT 1) AS owner_user_id,
      (SELECT user_id FROM ad_favorites LIMIT 1) AS fav_user_id,
      (SELECT id FROM conversations ORDER BY last_message_at DESC LIMIT 1) AS conv_id,
      (SELECT CASE WHEN buyer_id IS NOT NULL THEN buyer_id ELSE seller_id END FROM conversations LIMIT 1) AS inbox_user_id
  `);
  out.sampleIds = samples[0] || {};

  const sid = out.sampleIds;
  const adId = sid.ad_id;
  const categoryId = sid.category_id ?? 1;
  const ownerUserId = sid.owner_user_id ?? 1;
  const favUserId = sid.fav_user_id ?? ownerUserId;
  const convId = sid.conv_id ?? 1;
  const inboxUserId = sid.inbox_user_id ?? 1;

  async function explainPlan(name, sql, params) {
    try {
      const rows = await q(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`, params);
      const plan = rows.map((r) => r["QUERY PLAN"]).join("\n");
      const usesSeq = /Seq Scan/i.test(plan);
      const usesIndex = /Index Scan|Index Only Scan|Bitmap Index Scan/i.test(plan);
      out.explains[name] = {
        usesSeqScan: usesSeq,
        usesIndex,
        executionTimeMs: extractTime(plan),
        planSnippet: plan.split("\n").slice(0, 12).join("\n"),
      };
    } catch (e) {
      out.explains[name] = { error: String(e.message || e) };
    }
  }

  await explainPlan(
    "recommended",
    `SELECT id FROM ads WHERE status = 'approved' ORDER BY created_at DESC LIMIT 20`,
    [],
  );
  await explainPlan(
    "featured",
    `SELECT id FROM ads WHERE featured = true AND status = 'approved' ORDER BY created_at DESC LIMIT 10`,
    [],
  );
  await explainPlan(
    "category",
    `SELECT id FROM ads WHERE category_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 50`,
    [categoryId],
  );
  await explainPlan(
    "mine",
    `SELECT id FROM ads WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [ownerUserId],
  );
  await explainPlan(
    "favorites",
    `SELECT a.id FROM ads a INNER JOIN ad_favorites f ON f.ad_id = a.id AND f.user_id = $1 WHERE a.status = 'approved' ORDER BY a.created_at DESC LIMIT 50`,
    [favUserId],
  );
  await explainPlan(
    "inbox",
    `SELECT c.id FROM conversations c INNER JOIN ads a ON a.id = c.ad_id WHERE (c.buyer_id = $1 OR c.seller_id = $1) ORDER BY c.last_message_at DESC LIMIT 100`,
    [inboxUserId],
  );
  await explainPlan(
    "messages_thread",
    `SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [convId],
  );

  console.log(JSON.stringify(out, null, 2));
  await pool.end();
}

function extractTime(plan) {
  const m = plan.match(/Execution Time:\s*([\d.]+)\s*ms/);
  return m ? Number(m[1]) : null;
}

main().catch(async (e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
