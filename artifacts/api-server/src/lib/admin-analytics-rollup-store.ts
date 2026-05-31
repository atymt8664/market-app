import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import type {
  AdminAnalyticsPayload,
  AdminStatsPeriod,
} from "./admin-analytics-compute";

const ROLLUP_DDL = `
  CREATE TABLE IF NOT EXISTS admin_analytics_daily_rollups (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (period, snapshot_date)
  );
  CREATE INDEX IF NOT EXISTS admin_analytics_daily_rollups_date_idx
    ON admin_analytics_daily_rollups (snapshot_date DESC);
`;

let ensureRollupSchemaPromise: Promise<void> | null = null;

export async function ensureAdminAnalyticsRollupSchema(): Promise<void> {
  if (!ensureRollupSchemaPromise) {
    ensureRollupSchemaPromise = pool.query(ROLLUP_DDL).then(() => undefined).catch((err) => {
      ensureRollupSchemaPromise = null;
      throw err;
    });
  }
  return ensureRollupSchemaPromise;
}

function utcSnapshotDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function upsertAdminAnalyticsRollup(params: {
  period: AdminStatsPeriod;
  payload: AdminAnalyticsPayload;
  snapshotDate?: string;
}): Promise<void> {
  await ensureAdminAnalyticsRollupSchema();
  const snapshotDate = params.snapshotDate ?? utcSnapshotDate();
  await db.execute(sql`
    INSERT INTO admin_analytics_daily_rollups (period, snapshot_date, payload, computed_at)
    VALUES (
      ${params.period},
      ${snapshotDate}::date,
      ${JSON.stringify(params.payload)}::jsonb,
      now()
    )
    ON CONFLICT (period, snapshot_date)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      computed_at = EXCLUDED.computed_at
  `);
}

export async function readAdminAnalyticsRollup(
  period: AdminStatsPeriod,
  snapshotDate?: string,
): Promise<AdminAnalyticsPayload | null> {
  await ensureAdminAnalyticsRollupSchema();
  const date = snapshotDate ?? utcSnapshotDate();
  const rows = await db.execute<{ payload: AdminAnalyticsPayload }>(sql`
    SELECT payload
    FROM admin_analytics_daily_rollups
    WHERE period = ${period}
      AND snapshot_date = ${date}::date
    LIMIT 1
  `);
  const raw = rows.rows[0]?.payload;
  if (!raw || typeof raw !== "object") return null;
  return raw as AdminAnalyticsPayload;
}

export async function upsertAllAdminAnalyticsRollups(
  payloads: AdminAnalyticsPayload[],
  snapshotDate?: string,
): Promise<number> {
  let written = 0;
  for (const payload of payloads) {
    await upsertAdminAnalyticsRollup({
      period: payload.period,
      payload,
      snapshotDate,
    });
    written += 1;
  }
  return written;
}

export { utcSnapshotDate as analyticsRollupSnapshotDate };
