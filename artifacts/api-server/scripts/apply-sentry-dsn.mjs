/**
 * One-time: save SENTRY_DSN from Sentry onboarding into .env.local (never prints the DSN).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dsn = process.argv[2]?.trim();
if (!dsn) {
  console.error("Usage: node scripts/apply-sentry-dsn.mjs \"<SENTRY_DSN>\"");
  process.exit(1);
}

if (!/^https:\/\/[a-f0-9]+@/i.test(dsn) || !dsn.includes("sentry")) {
  console.error("Invalid DSN format");
  process.exit(1);
}

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(apiRoot, ".env.local");
let lines = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, "utf8").split(/\r?\n/) : [];
const keys = new Set(["SENTRY_DSN", "SENTRY_ENVIRONMENT"]);
const kept = lines.filter((line) => !keys.has(line.split("=")[0]?.trim()));
while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
kept.push("SENTRY_DSN=" + dsn, "SENTRY_ENVIRONMENT=development", "");
fs.writeFileSync(envLocal, kept.join("\n"), "utf8");
console.log("OK: saved to .env.local — run: pnpm run sentry:local-test");
