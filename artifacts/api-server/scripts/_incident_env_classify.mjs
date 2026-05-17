import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const url = process.env.DATABASE_URL?.trim() || "";
const lower = url.toLowerCase();
const blocked = (process.env.PRODUCTION_DB_HOST_PATTERNS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

let matchesProductionBlocklist = false;
let matchedPattern = null;
for (const p of blocked) {
  if (p && lower.includes(p)) {
    matchesProductionBlocklist = true;
    matchedPattern = p;
    break;
  }
}

let supabaseRef = null;
const su = process.env.SUPABASE_URL || "";
const m = su.match(/https:\/\/([^.]+)\.supabase\.co/);
if (m) supabaseRef = m[1];

console.log(
  JSON.stringify(
    {
      hasDatabaseUrl: !!url,
      supabaseProjectRef: supabaseRef,
      productionBlocklistConfigured: blocked.length > 0,
      localUrlMatchesProductionBlocklist: matchesProductionBlocklist,
      matchedBlockPattern: matchedPattern,
      classifiedAs: matchesProductionBlocklist
        ? "marked_production_by_blocklist"
        : blocked.length > 0
          ? "not_matching_production_blocklist_likely_staging"
          : "unknown_no_blocklist",
    },
    null,
    2,
  ),
);
