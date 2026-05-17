/**
 * Phase 7A.1b — ad_views dedup execution. ad_views DELETE only.
 * Exports doomed ids before delete. No secrets in stdout.
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

const AUDIT_BASELINE = { total_rows: 151, unique_pairs: 16, duplicate_groups: 11, rows_to_delete: 135 };
const BATCH_SIZE = 500;

async function preview(client) {
  const a1 = await client.query(`
    SELECT COUNT(*)::bigint AS total_rows, COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs
    FROM ad_views`);
  const a2 = await client.query(`
    SELECT COUNT(*)::bigint AS duplicate_groups, COALESCE(SUM(row_count - 1), 0)::bigint AS rows_to_delete
    FROM (SELECT COUNT(*)::bigint AS row_count FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1) g`);
  const a3 = await client.query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM (SELECT MIN(id) AS keep_id FROM ad_views GROUP BY ad_id, viewer_key) keepers) AS rows_to_keep,
      (SELECT COUNT(*)::bigint FROM ad_views v WHERE NOT EXISTS (
        SELECT 1 FROM (SELECT MIN(id) AS keep_id FROM ad_views GROUP BY ad_id, viewer_key) k WHERE k.keep_id = v.id
      )) AS rows_to_delete`);
  const a4 = await client.query(`
    SELECT ad_id, LEFT(viewer_key, 16) AS viewer_key_prefix, COUNT(*)::int AS row_count,
           MIN(id) AS keep_id, MAX(id) AS max_id, ARRAY_AGG(id ORDER BY id) AS all_ids
    FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1
    ORDER BY row_count DESC, ad_id LIMIT 20`);
  return {
    total_rows: Number(a1.rows[0].total_rows),
    unique_pairs: Number(a1.rows[0].unique_pairs),
    duplicate_groups: Number(a2.rows[0].duplicate_groups),
    rows_to_delete_a2: Number(a2.rows[0].rows_to_delete),
    rows_to_keep: Number(a3.rows[0].rows_to_keep),
    rows_to_delete_a3: Number(a3.rows[0].rows_to_delete),
    top_duplicates: a4.rows,
  };
}

async function exportDoomedIds(client) {
  const r = await client.query(`
    SELECT v.id, v.ad_id, LEFT(v.viewer_key, 24) AS viewer_key_prefix, v.created_at
    FROM ad_views v
    INNER JOIN (
      SELECT ad_id, viewer_key, MIN(id) AS keep_id
      FROM ad_views GROUP BY ad_id, viewer_key
    ) k ON k.ad_id = v.ad_id AND k.viewer_key = v.viewer_key
    WHERE v.id <> k.keep_id
    ORDER BY v.id`);
  return r.rows;
}

function shouldProceedWithDelete(preview) {
  const del = preview.rows_to_delete_a2;
  const del3 = preview.rows_to_delete_a3;
  if (del !== del3) {
    return { proceed: false, reason: `a2_a3_mismatch:${del}_vs_${del3}` };
  }
  if (preview.duplicate_groups === 0 || del === 0) {
    return { proceed: false, reason: "no_duplicates_already_clean", skipDelete: true };
  }
  const total = preview.total_rows;
  const nearBaseline =
    total >= AUDIT_BASELINE.total_rows - 30 &&
    total <= AUDIT_BASELINE.total_rows + 30;
  if (nearBaseline) {
    const delOk =
      del >= AUDIT_BASELINE.rows_to_delete - 25 &&
      del <= AUDIT_BASELINE.rows_to_delete + 25;
    if (!delOk) {
      return {
        proceed: false,
        reason: `rows_to_delete_${del}_far_from_baseline_${AUDIT_BASELINE.rows_to_delete}_with_total_${total}`,
      };
    }
  }
  return { proceed: true, reason: "ok" };
}

async function verify(client) {
  const c1 = await client.query(`
    SELECT COUNT(*)::bigint AS duplicate_groups_remaining
    FROM (SELECT 1 FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1) t`);
  const c2 = await client.query(`
    SELECT COALESCE(SUM(c - 1), 0)::bigint AS duplicate_rows_remaining
    FROM (SELECT COUNT(*)::bigint AS c FROM ad_views GROUP BY ad_id, viewer_key HAVING COUNT(*) > 1) d`);
  const c3 = await client.query(`
    SELECT COUNT(*)::bigint AS total_rows_after, COUNT(DISTINCT (ad_id, viewer_key))::bigint AS unique_pairs_after
    FROM ad_views`);
  const c4 = await client.query(`
    SELECT COUNT(*)::bigint AS bad_pairs
    FROM (SELECT ad_id, viewer_key FROM ad_views GROUP BY ad_id, viewer_key
          HAVING COUNT(*) <> 1 OR MIN(id) <> MAX(id)) bad`);
  const minIdCheck = await client.query(`
    SELECT COUNT(*)::bigint AS violations
    FROM ad_views v
    WHERE EXISTS (
      SELECT 1 FROM ad_views v2
      WHERE v2.ad_id = v.ad_id AND v2.viewer_key = v.viewer_key AND v2.id < v.id
    )`);
  return {
    duplicate_groups_remaining: Number(c1.rows[0].duplicate_groups_remaining),
    duplicate_rows_remaining: Number(c2.rows[0].duplicate_rows_remaining),
    total_rows_after: Number(c3.rows[0].total_rows_after),
    unique_pairs_after: Number(c3.rows[0].unique_pairs_after),
    bad_pairs: Number(c4.rows[0].bad_pairs),
    rows_not_min_id: Number(minIdCheck.rows[0].violations),
  };
}

async function deleteBatch(client) {
  const r = await client.query(`
    WITH doomed AS (
      SELECT v.id
      FROM ad_views v
      INNER JOIN (
        SELECT ad_id, viewer_key, MIN(id) AS keep_id
        FROM ad_views GROUP BY ad_id, viewer_key
      ) k ON k.ad_id = v.ad_id AND k.viewer_key = v.viewer_key
      WHERE v.id <> k.keep_id
      ORDER BY v.id
      LIMIT $1
    )
    DELETE FROM ad_views
    WHERE id IN (SELECT id FROM doomed)
    RETURNING id`, [BATCH_SIZE]);
  return r.rowCount ?? r.rows.length;
}

async function main() {
  const report = {
    ok: false,
    phase: "7A.1b",
    hostHint: safeHostHint(DATABASE_URL),
    executedAt: new Date().toISOString(),
    auditBaseline: AUDIT_BASELINE,
    previewBefore: null,
    exportPath: null,
    exportCount: 0,
    proceedDecision: null,
    deleteExecuted: false,
    batches: [],
    totalDeleted: 0,
    previewAfter: null,
    verification: null,
    touchedOnlyAdViews: true,
  };

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  report.previewBefore = await preview(client);
  const doomed = await exportDoomedIds(client);
  report.exportCount = doomed.length;

  const outDir = path.join(__dirname, ".phase7a1b-exports");
  fs.mkdirSync(outDir, { recursive: true });
  const exportFile = path.join(outDir, `doomed_ids_${report.executedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(
    exportFile,
    JSON.stringify(
      {
        exportedAt: report.executedAt,
        count: doomed.length,
        ids: doomed.map((r) => r.id),
        rows: doomed,
      },
      null,
      2,
    ),
  );
  report.exportPath = exportFile.replace(/.*[\\/]artifacts[\\/]api-server[\\/]/, "artifacts/api-server/");

  report.proceedDecision = shouldProceedWithDelete(report.previewBefore);

  if (!report.proceedDecision.proceed) {
    if (report.proceedDecision.skipDelete) {
      report.verification = await verify(client);
      report.ok =
        report.verification.duplicate_groups_remaining === 0 &&
        report.verification.duplicate_rows_remaining === 0;
      report.deleteExecuted = false;
    }
    await client.end();
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }

  if (doomed.length !== report.previewBefore.rows_to_delete_a2) {
    report.proceedDecision = { proceed: false, reason: `export_count_${doomed.length}_vs_preview_${report.previewBefore.rows_to_delete_a2}` };
    await client.end();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.deleteExecuted = true;
  let batchNum = 0;
  let deleted;
  do {
    batchNum += 1;
    deleted = await deleteBatch(client);
    report.batches.push({ batch: batchNum, deleted });
    report.totalDeleted += deleted;
  } while (deleted > 0 && batchNum < 100);

  report.verification = await verify(client);
  report.previewAfter = {
    total_rows: report.verification.total_rows_after,
    unique_pairs: report.verification.unique_pairs_after,
  };

  report.ok =
    report.verification.duplicate_groups_remaining === 0 &&
    report.verification.duplicate_rows_remaining === 0 &&
    report.verification.total_rows_after === report.verification.unique_pairs_after &&
    report.verification.bad_pairs === 0 &&
    report.verification.rows_not_min_id === 0 &&
    report.totalDeleted === report.exportCount;

  await client.end();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
