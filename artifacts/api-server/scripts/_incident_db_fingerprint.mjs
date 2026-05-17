/**
 * Incident: fingerprint DB configs without printing secrets.
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function fingerprintUrl(url, label) {
  if (!url?.trim()) return { label, configured: false };
  try {
    const u = new URL(url.replace(/^postgres:/, "http:"));
    const host = u.hostname;
    const port = u.port || "5432";
    const db = u.pathname.replace(/^\//, "") || "postgres";
    const pooler = host.includes("pooler");
    const refMatch =
      host.match(/db\.([a-z0-9]+)\.supabase\.co/i) ||
      host.match(/([a-z0-9]{12,})\.supabase\.co/i);
    const projectRef = refMatch ? refMatch[1] : null;
    return { label, configured: true, host, port, database: db, pooler, projectRef };
  } catch {
    return { label, configured: true, parseError: true };
  }
}

function loadEnvFile(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  return dotenv.parse(fs.readFileSync(p, "utf8"));
}

const base = loadEnvFile(".env");
const local = loadEnvFile(".env.local");

const merged = { ...base, ...local };
const baseOnly = fingerprintUrl(base.DATABASE_URL, "dotenv_.env");
const localOnly = fingerprintUrl(local.DATABASE_URL, "dotenv_.env.local");
const mergedFp = fingerprintUrl(merged.DATABASE_URL, "merged_.env+_.env.local");

const supabaseLocal = (() => {
  const u = local.SUPABASE_URL || base.SUPABASE_URL || "";
  const m = u.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
})();

console.log(
  JSON.stringify(
    {
      envFiles: {
        base: baseOnly,
        localOverride: localOnly,
        effectiveLocalDev: mergedFp,
        supabaseProjectRefFromUrl: supabaseLocal,
        localOverridesBase: !!local.DATABASE_URL,
      },
      note: "No passwords or full URLs emitted",
    },
    null,
    2,
  ),
);
