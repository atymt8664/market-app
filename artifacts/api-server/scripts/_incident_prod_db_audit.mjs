/**
 * Audit a DB by fingerprint label. Pass CONNECTION_URL via env TARGET_DATABASE_URL only.
 * This script never prints the URL.
 */
import pg from "pg";

const url = process.env.TARGET_DATABASE_URL?.trim();
const label = process.env.TARGET_LABEL || "target";
if (!url) {
  console.log(JSON.stringify({ ok: false, error: "TARGET_DATABASE_URL missing" }));
  process.exit(1);
}

function fp(url) {
  try {
    const u = new URL(url.replace(/^postgres:/, "http:"));
    return { host: u.hostname, port: u.port || "5432", database: u.pathname.replace(/^\//, "") || "postgres" };
  } catch {
    return { host: "unknown" };
  }
}

const INDEXES_7A1A = [
  "ads_status_created_at_idx",
  "ads_featured_status_created_at_idx",
  "ads_user_id_created_at_idx",
  "ads_category_status_created_at_idx",
  "ad_favorites_user_id_created_at_idx",
  "messages_conversation_created_at_idx",
  "messages_conv_unread_idx",
  "conversations_buyer_last_msg_idx",
  "conversations_seller_last_msg_idx",
  "ad_views_ad_id_idx",
];

const useSsl = url.toLowerCase().includes("supabase");
const client = new pg.Client({
  connectionString: url,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

await client.connect();
const hostFp = fp(url);

const ad65 = await client.query(`SELECT id, status, views FROM ads WHERE id = 65`);
const dup = await client.query(`
  SELECT COUNT(*)::int AS duplicate_groups, COALESCE(SUM(c-1),0)::int AS duplicate_rows_remaining
  FROM (SELECT COUNT(*)::int c FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*)>1) x`);
const totals = await client.query(`
  SELECT COUNT(*)::int total_rows, COUNT(DISTINCT (ad_id, viewer_key))::int unique_pairs FROM ad_views`);
const uniq = await client.query(`
  SELECT c.relname, ix.indisunique, ix.indisvalid
  FROM pg_class c JOIN pg_index ix ON ix.indexrelid=c.oid
  WHERE c.relname='ad_views_ad_viewer_unique'`);
const idx7a = await client.query(`
  SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1::text[])`, [INDEXES_7A1A]);

await client.end();

console.log(
  JSON.stringify(
    {
      label,
      host: hostFp.host,
      port: hostFp.port,
      ad65: ad65.rows[0] ?? null,
      ad_views: { ...totals.rows[0], ...dup.rows[0] },
      uniqueIndex: uniq.rows[0] ?? null,
      indexes7a1aPresent: idx7a.rows.map((r) => r.indexname).sort(),
      indexes7a1aMissing: INDEXES_7A1A.filter((n) => !idx7a.rows.some((r) => r.indexname === n)),
    },
    null,
    2,
  ),
);
