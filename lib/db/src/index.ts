import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { resolvePgPoolConfig } from "./pool-config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
const lower = connectionString.toLowerCase();
/** Supabase and many cloud Postgres URLs require TLS from Node (e.g. Railway → Supabase). */
const useSsl =
  lower.includes("supabase.co") ||
  lower.includes("sslmode=require") ||
  process.env["PGSSLMODE"] === "require";

const poolConfig = resolvePgPoolConfig();

/** Supabase transaction pooler (:6543) does not support prepared statements (node-pg + Drizzle). */
const disablePreparedStatements =
  lower.includes("pooler.supabase.com") && lower.includes(":6543");

export const pool = new Pool({
  connectionString,
  max: poolConfig.max,
  idleTimeoutMillis: poolConfig.idleTimeoutMillis,
  connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
  ...(disablePreparedStatements ? { prepare: false as const } : {}),
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
pool.on("connect", (client) => {
  void client.query("SET client_encoding TO 'UTF8'");
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export { citiesTable } from "./schema/cities";
export { resolvePgPoolConfig, type PgPoolConfig } from "./pool-config";
export * from "./p17";
