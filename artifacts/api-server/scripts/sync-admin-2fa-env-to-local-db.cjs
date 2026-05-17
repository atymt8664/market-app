/**
 * LOCAL / STAGING ONLY: copy admin 2FA columns from `artifacts/api-server/.env` DATABASE_URL
 * to `artifacts/api-server/.env.local` DATABASE_URL when they differ.
 *
 * Use when the API reads `.env.local` but 2FA was configured on the older `.env` database.
 * Does not print secrets. Requires ALLOW_SYNC_ADMIN_2FA_LOCAL=1.
 */
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { Client } = require("pg");

const apiServerRoot = path.resolve(__dirname, "..");

if (process.env.ALLOW_SYNC_ADMIN_2FA_LOCAL !== "1") {
  console.error("Refusing to run: set ALLOW_SYNC_ADMIN_2FA_LOCAL=1 for explicit local/staging sync.");
  process.exit(1);
}

const envParsed = dotenv.parse(
  fs.readFileSync(path.join(apiServerRoot, ".env"), "utf8"),
);
const localPath = path.join(apiServerRoot, ".env.local");
if (!fs.existsSync(localPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}
const localParsed = dotenv.parse(fs.readFileSync(localPath, "utf8"));

const urlSource = String(envParsed.DATABASE_URL || "").trim();
const urlTarget = String(localParsed.DATABASE_URL || "").trim();

if (!urlSource || !urlTarget) {
  console.error("DATABASE_URL missing in .env and/or .env.local");
  process.exit(1);
}
if (urlSource === urlTarget) {
  console.error("Source and target DATABASE_URL are the same; nothing to sync.");
  process.exit(1);
}

async function main() {
  const src = new Client({ connectionString: urlSource });
  const tgt = new Client({ connectionString: urlTarget });
  await src.connect();
  await tgt.connect();
  try {
    const r = await src.query(
      `select admin_2fa_enabled, admin_2fa_secret, admin_backup_codes_hash, admin_2fa_enabled_at
       from app_settings where id = 1 limit 1`,
    );
    const row = r.rows[0];
    if (!row) {
      throw new Error("app_settings row missing on source database");
    }
    const enabled = Boolean(row.admin_2fa_enabled);
    const secret =
      typeof row.admin_2fa_secret === "string" ? row.admin_2fa_secret.trim() : "";
    if (!enabled || !secret) {
      throw new Error("Source database does not have 2FA enabled with a stored secret; use admin UI to enable.");
    }

    await tgt.query(
      `update app_settings set
        admin_2fa_enabled = $1,
        admin_2fa_secret = $2,
        admin_backup_codes_hash = $3,
        admin_2fa_enabled_at = $4,
        admin_security_revision = coalesce(admin_security_revision, 0) + 1,
        updated_at = now()
       where id = 1`,
      [
        true,
        row.admin_2fa_secret,
        row.admin_backup_codes_hash ?? null,
        row.admin_2fa_enabled_at ?? null,
      ],
    );

    console.log("Synced admin 2FA state from .env DB to .env.local DB (id=1). Same Authenticator secret as before.");
  } finally {
    await src.end();
    await tgt.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
