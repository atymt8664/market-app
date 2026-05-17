/**
 * Production DB alignment — 7A.1a + 7A.1b + 7A.1c on Railway production ONLY.
 *
 * REQUIRED: PRODUCTION_DATABASE_URL in environment (from Railway dashboard).
 * NEVER uses .env.local DATABASE_URL (staging).
 *
 * Does not print secrets. Aborts if project ref is not nptfxtkedqndkgmrcntn.
 */
import pg from "pg";
import { assertProductionRef, refFromUrl } from "./_incident_ref_gate.mjs";

const PROD_REF = "nptfxtkedqndkgmrcntn";
const STAGING_REF = "qkczposlooaldmsjfmun";

const url = process.env.PRODUCTION_DATABASE_URL?.trim();
if (!url) {
  console.log(
    JSON.stringify({
      ok: false,
      error: "PRODUCTION_DATABASE_URL not set",
      hint: "Set from Railway → Production service → Variables → DATABASE_URL (do not commit)",
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

const INDEXES = [
  {
    name: "ads_status_created_at_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_status_created_at_idx ON ads (status, created_at DESC)`,
  },
  {
    name: "ads_featured_status_created_at_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_featured_status_created_at_idx ON ads (created_at DESC) WHERE featured = true AND status = 'approved'`,
  },
  {
    name: "ads_user_id_created_at_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_user_id_created_at_idx ON ads (user_id, created_at DESC) WHERE user_id IS NOT NULL`,
  },
  {
    name: "ads_category_status_created_at_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_category_status_created_at_idx ON ads (category_id, status, created_at DESC)`,
  },
  {
    name: "ad_favorites_user_id_created_at_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_favorites_user_id_created_at_idx ON ad_favorites (user_id, created_at DESC)`,
  },
  {
    name: "messages_conversation_created_at_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_conversation_created_at_idx ON messages (conversation_id, created_at ASC)`,
  },
  {
    name: "messages_conv_unread_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_conv_unread_idx ON messages (conversation_id, sender_id) WHERE read_at IS NULL`,
  },
  {
    name: "conversations_buyer_last_msg_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_buyer_last_msg_idx ON conversations (buyer_id, last_message_at DESC)`,
  },
  {
    name: "conversations_seller_last_msg_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_seller_last_msg_idx ON conversations (seller_id, last_message_at DESC)`,
  },
  {
    name: "ad_views_ad_id_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_views_ad_id_idx ON ad_views (ad_id)`,
  },
];

const useSsl = url.toLowerCase().includes("supabase");

async function metrics(client) {
  const t = await client.query(
    `SELECT COUNT(*)::int total_rows, COUNT(DISTINCT (ad_id, viewer_key))::int unique_pairs FROM ad_views`,
  );
  const d = await client.query(`
    SELECT COUNT(*)::int duplicate_groups, COALESCE(SUM(c-1),0)::int duplicate_rows_remaining
    FROM (SELECT COUNT(*)::int c FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*)>1) x`);
  return { ...t.rows[0], ...d.rows[0] };
}

async function indexValid(client, name) {
  const r = await client.query(
    `SELECT ix.indisvalid, ix.indisunique FROM pg_class c
     JOIN pg_index ix ON ix.indexrelid=c.oid WHERE c.relname=$1`,
    [name],
  );
  return r.rows[0] ?? null;
}

async function main() {
  const report = {
    ok: false,
    phase: "production_7a1_alignment",
    projectRef: PROD_REF,
    executedAt: new Date().toISOString(),
    preCheck: null,
    indexes: [],
    dedup: null,
    unique: null,
    postCheck: null,
  };

  const client = new pg.Client({
    connectionString: url,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  const ad65 = await client.query(`SELECT id, status, views FROM ads WHERE id = 65`);
  report.preCheck = {
    projectRefConfirmed: refFromUrl(url),
    ad65: ad65.rows[0] ?? null,
    ad_views: await metrics(client),
    uniqueExists: !!(await indexValid(client, "ad_views_ad_viewer_unique")),
  };

  if (report.preCheck.projectRefConfirmed !== PROD_REF) {
    throw new Error("ref_gate_failed");
  }

  for (const idx of INDEXES) {
    const entry = { name: idx.name, created: false, alreadyValid: false, error: null };
    const st = await indexValid(client, idx.name);
    if (st?.indisvalid) {
      entry.alreadyValid = true;
    } else {
      if (st && st.indisvalid === false) {
        await client.query(`DROP INDEX CONCURRENTLY IF EXISTS ${idx.name}`);
      }
      await client.query(idx.sql);
      entry.created = true;
      const after = await indexValid(client, idx.name);
      if (!after?.indisvalid) throw new Error(`index_invalid:${idx.name}`);
    }
    report.indexes.push(entry);
  }

  const beforeDedup = await metrics(client);
  let deleted = 0;
  if (beforeDedup.duplicate_groups > 0) {
    const del = await client.query(`
      WITH doomed AS (
        SELECT v.id FROM ad_views v
        INNER JOIN (
          SELECT ad_id, viewer_key, MIN(id) keep_id FROM ad_views GROUP BY ad_id, viewer_key
        ) k ON k.ad_id=v.ad_id AND k.viewer_key=v.viewer_key
        WHERE v.id <> k.keep_id
      )
      DELETE FROM ad_views WHERE id IN (SELECT id FROM doomed) RETURNING id`);
    deleted = del.rowCount ?? del.rows.length;
  }
  const afterDedup = await metrics(client);
  report.dedup = { deleted, before: beforeDedup, after: afterDedup };

  if (afterDedup.duplicate_groups !== 0) {
    throw new Error("dedup_failed_duplicates_remain");
  }

  const uq = await indexValid(client, "ad_views_ad_viewer_unique");
  if (!uq?.indisvalid || !uq?.indisunique) {
    if (uq && uq.indisvalid === false) {
      await client.query(`DROP INDEX CONCURRENTLY IF EXISTS ad_views_ad_viewer_unique`);
    }
    await client.query(
      `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ad_views_ad_viewer_unique ON public.ad_views (ad_id, viewer_key)`,
    );
  }
  const uqAfter = await indexValid(client, "ad_views_ad_viewer_unique");
  report.unique = { index: uqAfter };

  report.postCheck = {
    ad_views: await metrics(client),
    ad65: (await client.query(`SELECT id, views FROM ads WHERE id=65`)).rows[0] ?? null,
  };

  report.ok =
    report.postCheck.ad_views.duplicate_groups === 0 &&
    report.postCheck.ad_views.total_rows === report.postCheck.ad_views.unique_pairs &&
    report.unique.index?.indisvalid === true &&
    report.unique.index?.indisunique === true;

  await client.end();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
