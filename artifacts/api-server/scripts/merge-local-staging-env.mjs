/**
 * One-time / manual: merge artifacts/api-server/.env + .env.local → single staging-focused .env.local,
 * then replace .env with a non-secret template (.env.example-based).
 * Does not print secret values. Run: node scripts/merge-local-staging-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const envPath = path.join(apiRoot, ".env");
const localPath = path.join(apiRoot, ".env.local");
const examplePath = path.join(apiRoot, ".env.example");

function load(p) {
  if (!fs.existsSync(p)) return {};
  return dotenv.parse(fs.readFileSync(p, "utf8"));
}

function stringifyLine(key, value) {
  if (value === undefined || value === null) return "";
  const v = String(value);
  if (/[\r\n#]/.test(v) || v.includes(" ") || /["'\\]/.test(v)) {
    return `${key}="${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"\n`;
  }
  return `${key}=${v}\n`;
}

function stringifyEnv(obj, orderedKeys) {
  let out = "";
  for (const k of orderedKeys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).length > 0) {
      out += stringifyLine(k, obj[k]);
    }
  }
  return out;
}

const base = load(envPath);
const local = load(localPath);

/** Local overrides base for all overlapping keys (staging DB wins). */
const merged = { ...base, ...local };

const header = `# Local/staging only — gitignored. Consolidated from .env + .env.local (local wins on conflicts).
# Do not commit. DATABASE_URL and Supabase keys must point to the same staging project.

`;

const order = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_UPLOADS_BUCKET",
  "ALLOW_REMOTE_DB_IN_DEV",
  "PRODUCTION_DB_HOST_PATTERNS",
  "PRODUCTION_SUPABASE_HOST_PATTERNS",
  "PORT",
  "NODE_ENV",
  "APP_URL",
  "FRONTEND_URL",
  "SESSION_COOKIE_SECURE",
  "SESSION_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "ADMIN_ACCESS_KEY",
  "AI_INTEGRATIONS_OPENAI_API_KEY",
];

const extraKeys = Object.keys(merged).filter((k) => !order.includes(k));
extraKeys.sort();

fs.writeFileSync(
  localPath,
  header + stringifyEnv(merged, order) + (extraKeys.length ? "\n# --- Other\n" + stringifyEnv(merged, extraKeys) : ""),
  "utf8",
);

/** Replace .env with example template + minimal dev defaults (no secrets). */
let template = fs.readFileSync(examplePath, "utf8");
if (!template.includes("PORT=")) {
  template += "\nPORT=3001\nNODE_ENV=development\n";
}
/** Ensure PORT/NODE_ENV lines exist for dx; example already documents PORT. */
if (!/^PORT=/m.test(template)) template += "\nPORT=3001\n";
if (!/^NODE_ENV=/m.test(template)) template += "NODE_ENV=development\n";

fs.writeFileSync(envPath, template, "utf8");

console.log("OK: wrote merged secrets to .env.local; replaced .env with template from .env.example (no secrets).");
