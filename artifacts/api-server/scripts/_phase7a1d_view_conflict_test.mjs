/**
 * Phase 7A.1d — verify onConflict (ad_id, viewer_key) + views increment logic.
 * Mirrors POST /ads/:adId/view insert path via SQL. No secrets logged.
 */
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const TEST_VIEWER_KEY = "test:phase7a1d-on-conflict";

if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, error: "DATABASE_URL not configured" }));
  process.exit(1);
}

const useSsl =
  DATABASE_URL.toLowerCase().includes("supabase.co") ||
  process.env.PGSSLMODE === "require";

async function countPair(client, adId, viewerKey) {
  const r = await client.query(
    `SELECT COUNT(*)::int AS c FROM ad_views WHERE ad_id = $1 AND viewer_key = $2`,
    [adId, viewerKey],
  );
  return r.rows[0].c;
}

async function getViews(client, adId) {
  const r = await client.query(`SELECT views FROM ads WHERE id = $1`, [adId]);
  return r.rows[0]?.views ?? 0;
}

/** Same semantics as route: INSERT ON CONFLICT DO NOTHING RETURNING id; bump views if inserted. */
async function recordView(client, adId, viewerKey) {
  const ins = await client.query(
    `INSERT INTO ad_views (ad_id, viewer_key)
     VALUES ($1, $2)
     ON CONFLICT (ad_id, viewer_key) DO NOTHING
     RETURNING id`,
    [adId, viewerKey],
  );
  const counted = ins.rowCount > 0;
  if (counted) {
    await client.query(`UPDATE ads SET views = views + 1 WHERE id = $1`, [adId]);
  }
  return { counted, views: await getViews(client, adId), insertedId: ins.rows[0]?.id ?? null };
}

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  const adRes = await client.query(
    `SELECT id, views FROM ads WHERE status = 'approved' ORDER BY id LIMIT 1`,
  );
  const ad = adRes.rows[0];
  if (!ad) {
    await client.end();
    console.log(JSON.stringify({ ok: false, error: "no_approved_ad" }));
    process.exit(1);
  }

  const adId = ad.id;
  const beforeRows = await countPair(client, adId, TEST_VIEWER_KEY);
  const viewsBefore = ad.views;

  let first;
  let second;
  try {
    first = await recordView(client, adId, TEST_VIEWER_KEY);
    second = await recordView(client, adId, TEST_VIEWER_KEY);
  } catch (e) {
    await client.end();
    console.log(
      JSON.stringify({
        ok: false,
        error: "sql_failed",
        message: String(e.message || e).slice(0, 300),
      }),
    );
    process.exit(1);
  }

  const afterRows = await countPair(client, adId, TEST_VIEWER_KEY);
  const freshPair = beforeRows === 0;

  const report = {
    ok:
      afterRows === 1 &&
      second.counted === false &&
      (freshPair
        ? first.counted === true && first.views === viewsBefore + 1
        : first.counted === false && first.views === viewsBefore) &&
      second.views === first.views,
    freshPairTest: freshPair,
    adId,
    viewerKeyPrefix: TEST_VIEWER_KEY.slice(0, 14) + "…",
    adViewsRowsBefore: beforeRows,
    adViewsRowsAfter: afterRows,
    viewsBeforeTest: viewsBefore,
    firstCall: first,
    secondCall: second,
  };

  await client.end();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
