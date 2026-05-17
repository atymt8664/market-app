/**
 * Phase 7A.1a execution — CREATE INDEX CONCURRENTLY only (010 migration).
 * No DML, no UNIQUE. Does not log DATABASE_URL or secrets.
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
    const port = u.port || "5432";
    const pooler = u.hostname.includes("pooler");
    return { hostname: u.hostname, port, pooler };
  } catch {
    return { hostname: "configured", port: "?", pooler: null };
  }
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

const TARGET_NAMES = new Set(INDEXES.map((i) => i.name));

async function indexStatus(client, indexName) {
  const rows = await client.query(
    `SELECT c.relname AS index_name, i.indisvalid, i.indisready
     FROM pg_class c
     JOIN pg_index i ON i.indexrelid = c.oid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1`,
    [indexName],
  );
  return rows.rows[0] ?? null;
}

async function dropInvalid(client, indexName) {
  await client.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${indexName}`);
}

function extractTime(plan) {
  const m = plan.match(/Execution Time:\s*([\d.]+)\s*ms/);
  return m ? Number(m[1]) : null;
}

async function explain(client, name, sql, params) {
  const rows = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`, params);
  const plan = rows.rows.map((r) => r["QUERY PLAN"]).join("\n");
  return {
    name,
    usesSeqScan: /Seq Scan/i.test(plan),
    usesIndex: /Index Scan|Index Only Scan|Bitmap Index Scan/i.test(plan),
    executionTimeMs: extractTime(plan),
    planSnippet: plan.split("\n").slice(0, 10).join("\n"),
  };
}

async function main() {
  const host = safeHostHint(DATABASE_URL);
  const report = {
    ok: true,
    phase: "7A.1a",
    hostHint: host,
    executedAt: new Date().toISOString(),
    indexes: [],
    rollbacks: [],
    stoppedEarly: false,
    stopReason: null,
    verification: { allTargetIndexes: [], explains: {} },
  };

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  for (const idx of INDEXES) {
    const entry = { name: idx.name, created: false, alreadyExisted: false, valid: null, error: null };
    try {
      const before = await indexStatus(client, idx.name);
      if (before?.indisvalid === true) {
        entry.alreadyExisted = true;
        entry.valid = true;
        report.indexes.push(entry);
        continue;
      }
      if (before && before.indisvalid === false) {
        report.rollbacks.push({ name: idx.name, action: "drop_invalid_before_create" });
        await dropInvalid(client, idx.name);
      }
      await client.query(idx.sql);
      const after = await indexStatus(client, idx.name);
      entry.created = !entry.alreadyExisted;
      entry.valid = after?.indisvalid === true;
      if (!after || after.indisvalid !== true) {
        entry.error = "index_missing_or_invalid_after_create";
        report.ok = false;
        report.stoppedEarly = true;
        report.stopReason = `invalid_after_create:${idx.name}`;
        if (after && after.indisvalid === false) {
          report.rollbacks.push({ name: idx.name, action: "drop_invalid_after_failed_verify" });
          await dropInvalid(client, idx.name);
        }
        report.indexes.push(entry);
        break;
      }
    } catch (e) {
      entry.error = String(e.message || e).slice(0, 500);
      report.ok = false;
      report.stoppedEarly = true;
      report.stopReason = `create_failed:${idx.name}`;
      const st = await indexStatus(client, idx.name).catch(() => null);
      if (st && st.indisvalid === false) {
        report.rollbacks.push({ name: idx.name, action: "drop_invalid_after_error" });
        await dropInvalid(client, idx.name).catch(() => {});
      }
      report.indexes.push(entry);
      break;
    }
    report.indexes.push(entry);
  }

  const allIdx = await client.query(
    `SELECT c.relname AS index_name, ix.indisvalid, ix.indisready
     FROM pg_class c
     JOIN pg_index ix ON ix.indexrelid = c.oid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'i'
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname`,
    [[...TARGET_NAMES]],
  );
  report.verification.allTargetIndexes = allIdx.rows.map((r) => ({
    name: r.index_name,
    indisvalid: r.indisvalid,
    indisready: r.indisready,
  }));

  const samples = await client.query(`
    SELECT
      (SELECT category_id FROM ads WHERE status = 'approved' AND category_id IS NOT NULL LIMIT 1) AS category_id,
      (SELECT user_id FROM ads WHERE user_id IS NOT NULL ORDER BY created_at DESC LIMIT 1) AS owner_user_id,
      (SELECT user_id FROM ad_favorites LIMIT 1) AS fav_user_id,
      (SELECT id FROM conversations ORDER BY last_message_at DESC LIMIT 1) AS conv_id,
      (SELECT CASE WHEN buyer_id IS NOT NULL THEN buyer_id ELSE seller_id END FROM conversations LIMIT 1) AS inbox_user_id
  `);
  const s = samples.rows[0] || {};
  const categoryId = s.category_id ?? 1;
  const ownerUserId = s.owner_user_id ?? 1;
  const favUserId = s.fav_user_id ?? ownerUserId;
  const convId = s.conv_id ?? 1;
  const inboxUserId = s.inbox_user_id ?? 1;

  const explains = [
    ["recommended", `SELECT id FROM ads WHERE status = 'approved' ORDER BY created_at DESC LIMIT 20`, []],
    ["featured", `SELECT id FROM ads WHERE featured = true AND status = 'approved' ORDER BY created_at DESC LIMIT 10`, []],
    ["category", `SELECT id FROM ads WHERE category_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 50`, [categoryId]],
    ["mine", `SELECT id FROM ads WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [ownerUserId]],
    ["favorites", `SELECT a.id FROM ads a INNER JOIN ad_favorites f ON f.ad_id = a.id AND f.user_id = $1 WHERE a.status = 'approved' ORDER BY a.created_at DESC LIMIT 50`, [favUserId]],
    ["inbox", `SELECT c.id FROM conversations c INNER JOIN ads a ON a.id = c.ad_id WHERE (c.buyer_id = $1 OR c.seller_id = $1) ORDER BY c.last_message_at DESC LIMIT 100`, [inboxUserId]],
    ["messages_thread", `SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`, [convId]],
  ];

  for (const [name, sql, params] of explains) {
    try {
      report.verification.explains[name] = await explain(client, name, sql, params);
    } catch (e) {
      report.verification.explains[name] = { error: String(e.message || e).slice(0, 200) };
    }
  }

  await client.end();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
