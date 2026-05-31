#!/usr/bin/env node
/**
 * P15-3D — Static validation: media analysis invariants (no DB, no secrets).
 * Confirms no premature media job wiring and documents expected sync paths.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  console.error(`  FAIL ${msg}`);
  errors.push(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

console.log("=== P15-3D media analysis validate ===");

const analysisDoc = path.resolve(
  root,
  "../../docs/architecture/P15-3D-media-jobs-analysis.md",
);
fs.existsSync(analysisDoc)
  ? ok("P15-3D analysis document present")
  : bad("missing docs/architecture/P15-3D-media-jobs-analysis.md");

const requiredSync = [
  "src/lib/normalize-ad-image.ts",
  "src/lib/supabaseStorage.ts",
  "src/routes/storage.ts",
  "src/lib/account-deletion.ts",
];

for (const f of requiredSync) {
  exists(f) ? ok(`sync path file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
if (registry.includes("media.normalize")) {
  bad("media.normalize must NOT be registered (upload sync preserved)");
} else if (registry.includes("MEDIA_JOB_TYPES") && registry.includes("media.purge")) {
  ok("media.purge registered; media.normalize deferred (P15-3G closed upload path unchanged)");
} else if (registry.includes("media.normalize") || registry.includes("MEDIA_JOB")) {
  bad("unexpected media job types in registry");
} else {
  ok("no premature media job types in registry");
}

const persist = read("src/lib/notification-persist.ts");
persist.includes("routePushDeliveryAfterNotification")
  ? ok("P15-3C push routing intact (unchanged)")
  : bad("notification-persist push routing broken");

const supabase = read("src/lib/supabaseStorage.ts");
supabase.includes("normalizeAdImageForUpload") &&
supabase.includes("uploadAdImagesForUser")
  ? ok("ad upload still uses inline Sharp normalize (sync)")
  : bad("ad upload normalize path unexpected");

const storageRoute = read("src/routes/storage.ts");
storageRoute.includes("imageUrls")
  ? ok("ad upload API contract unchanged (imageUrls response)")
  : bad("ad upload response contract changed");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3D VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3D VALIDATE: PASS ===");
