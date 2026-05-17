/**
 * One-time: save SENTRY_DSN from Sentry onboarding into .env.local (never prints the DSN).
 *
 * Usage (paste DSN from Sentry → Project Settings → Client Keys (DSN)):
 *   node scripts/apply-sentry-dsn.mjs "https://....@....ingest.sentry.io/...."
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
  console.error("Invalid DSN format (expected https://<key>@<org>.ingest.sentry.io/<project>)");
  process.exit(1);
}

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(apiRoot, ".env.local");

let lines = [];
if (fs.existsSync(envLocal)) {
  lines = fs.readFileSync(envLocal, "utf8").split(/\r?\n/);
}

const keys = new Set(["SENTRY_DSN", "SENTRY_ENVIRONMENT"]);
const kept = lines.filter((line) => {
  const k = line.split("=")[0]?.trim();
  return !keys.has(k);
});

while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();

kept.push("SENTRY_DSN=" + dsn);
kept.push("SENTRY_ENVIRONMENT=development");
kept.push("");

fs.writeFileSync(envLocal, kept.join("\n"), "utf8");
console.log("OK: SENTRY_DSN and SENTRY_ENVIRONMENT=development saved to .env.local");
console.log("Next: pnpm run sentry:local-test");
