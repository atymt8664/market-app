const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

/**
 * Match `src/load-env.ts`: `artifacts/api-server/.env` then `.env.local` (override).
 * Do not rely on `process.cwd()` — `pnpm admin:reset-password` from the monorepo root
 * used to load the wrong `DATABASE_URL` when only `.env` differed from `.env.local`.
 */
const apiServerRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(apiServerRoot, ".env") });
const envLocalPath = path.join(apiServerRoot, ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

/** Last resort if DATABASE_URL is only in the monorepo root `.env`. */
if (!process.env.DATABASE_URL) {
  const repoRoot = path.resolve(apiServerRoot, "..", "..");
  dotenv.config({ path: path.join(repoRoot, ".env") });
}
const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const readline = require("readline");

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function readPasswordHidden(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(String(answer || ""));
    });
    rl._writeToOutput = () => {
      rl.output.write("*");
    };
  });
}

async function main() {
  let nextPassword = String(process.env.ADMIN_NEW_PASSWORD || "");
  if (!nextPassword) {
    process.stdout.write("Enter new admin password: ");
    nextPassword = await readPasswordHidden("");
    process.stdout.write("\n");
  }
  if (!isStrongPassword(nextPassword)) {
    throw new Error(
      "Password must be at least 8 chars and include uppercase, lowercase, number, and special character.",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(
      "create table if not exists app_settings (id integer primary key default 1, app_name text not null default 'سوق العرب EU', app_version text not null default '1.0.0', support_email text not null default 'souqarab.market@gmail.com', require_ad_approval boolean not null default true, reports_enabled boolean not null default true, support_enabled boolean not null default true, terms_path text not null default '/terms', privacy_path text not null default '/privacy', updated_at timestamptz not null default now(), updated_by_admin_id integer null)",
    );
    await client.query(
      "alter table app_settings add column if not exists admin_password_hash text",
    );
    await client.query(
      "insert into app_settings (id, app_name, app_version, support_email, require_ad_approval, reports_enabled, support_enabled, terms_path, privacy_path) values (1, 'سوق العرب EU', '1.0.0', 'souqarab.market@gmail.com', true, true, true, '/terms', '/privacy') on conflict (id) do nothing",
    );
    const hash = await bcrypt.hash(nextPassword, 12);
    await client.query(
      "update app_settings set admin_password_hash = $1, updated_at = now() where id = 1",
      [hash],
    );
    await client.query("commit");
    console.log("Admin password reset successfully.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
