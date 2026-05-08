/**
 * One-off local diagnostic: table existence + optional prepareDatabase.
 * Run: NODE_ENV=development node scripts/diag-notification-prefs.mjs
 * Does not print secrets.
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
process.chdir(root);

dotenv.config({ path: path.join(root, ".env") });
const local = path.join(root, ".env.local");
if (fs.existsSync(local)) {
  dotenv.config({ path: local, override: true });
}

if (!process.env.DATABASE_URL?.trim()) {
  console.log("DIAG: DATABASE_URL missing");
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const apply = process.argv.includes("--apply");

try {
  const r = await pool.query(
    "SELECT to_regclass('public.notification_preferences') AS reg",
  );
  let reg = r.rows[0]?.reg;
  console.log("DIAG_TABLE:", reg ? String(reg) : "MISSING");

  if (!reg && apply) {
    const migrationPath = path.resolve(
      __dirname,
      "../../../lib/db/migrations/006_notification_preferences.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8");
    await pool.query(sql);
    const r2 = await pool.query(
      "SELECT to_regclass('public.notification_preferences') AS reg",
    );
    reg = r2.rows[0]?.reg;
    console.log("DIAG_APPLY_DONE:", reg ? String(reg) : "STILL_MISSING");
  }
} catch (e) {
  console.log("DIAG_DB_ERROR:", e instanceof Error ? e.message : String(e));
  await pool.end();
  process.exit(1);
}
await pool.end();
