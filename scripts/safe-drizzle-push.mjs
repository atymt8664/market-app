import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

const root = process.cwd();
const apiEnv = path.join(root, "artifacts", "api-server", ".env");
const apiEnvLocal = path.join(root, "artifacts", "api-server", ".env.local");

dotenv.config({ path: apiEnv });
dotenv.config({ path: apiEnvLocal, override: true });

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const asTrue = (v) => (v ? TRUE_VALUES.has(String(v).trim().toLowerCase()) : false);

function hostOfUrl(raw) {
  if (!raw || !String(raw).trim()) return "";
  try {
    return new URL(String(raw)).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function parsePatterns(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function includesAny(host, patterns) {
  if (!host) return false;
  return patterns.some((p) => host.includes(p));
}

function includesAnyInRaw(raw, patterns) {
  if (!raw) return false;
  return patterns.some((p) => raw.includes(p));
}

const target = String(process.env.MIGRATION_TARGET || "").trim().toLowerCase();
if (target !== "staging") {
  console.error(
    '[safe-drizzle-push] blocked: set MIGRATION_TARGET=staging to run schema push.',
  );
  process.exit(1);
}

if (!asTrue(process.env.ALLOW_STAGING_MIGRATION)) {
  console.error(
    "[safe-drizzle-push] blocked: set ALLOW_STAGING_MIGRATION=1 to confirm intentional migration.",
  );
  process.exit(1);
}

const dbHost = hostOfUrl(process.env.DATABASE_URL);
const dbRaw = String(process.env.DATABASE_URL || "").trim().toLowerCase();
if (!dbHost) {
  console.error("[safe-drizzle-push] blocked: DATABASE_URL is missing or invalid.");
  process.exit(1);
}

const blockedPatterns = [
  ...parsePatterns(process.env.PRODUCTION_DB_HOST_PATTERNS),
  ...parsePatterns(process.env.PRODUCTION_SUPABASE_HOST_PATTERNS),
];

if (
  blockedPatterns.length > 0 &&
  (includesAny(dbHost, blockedPatterns) || includesAnyInRaw(dbRaw, blockedPatterns))
) {
  console.error(
    `[safe-drizzle-push] blocked: DATABASE_URL host matches production-like patterns (${dbHost}).`,
  );
  process.exit(1);
}

const child = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["--filter", "@workspace/db", "run", "push"],
  { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
