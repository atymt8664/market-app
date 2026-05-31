#!/usr/bin/env node
/**
 * Verification admin status filters — local validation (no secrets).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const apiClient = readFileSync(join(root, "src/features/admin/api/verification.ts"), "utf8");
assert(apiClient.includes('params.queue !== "all"'), "verification.ts must omit queue=all");
assert(apiClient.includes('params.status !== "all"'), "verification.ts must omit status=all");

const page = readFileSync(join(root, "src/pages/admin-verification.tsx"), "utf8");
assert(page.includes("VERIFICATION_STATUS_FILTER_KEYS"), "admin-verification must define status filters");
assert(page.includes("meQuery.isSuccess"), "admin-verification must wait for admin session");
assert(page.includes("p8.admin.verification.filter_"), "admin-verification must use filter_* i18n keys");

const hooks = readFileSync(join(root, "src/features/admin/hooks/list-hooks.ts"), "utf8");
assert(hooks.includes("params.status"), "list-hooks must include status in queryKey");

const workflow = readFileSync(
  join(repoRoot, "artifacts", "api-server", "src/lib/admin-verification-workflow.ts"),
  "utf8",
);
assert(workflow.includes("normalizeVerificationListFilters"), "API must normalize all filters");
assert(workflow.includes('status === "pending"'), "API must map pending to open statuses");

for (const locale of ["ar", "en", "de"]) {
  const json = JSON.parse(readFileSync(join(root, "src/i18n/locales", `${locale}.json`), "utf8"));
  for (const key of [
    "p8.admin.verification.filter_all",
    "p8.admin.verification.filter_pending",
    "p8.admin.verification.filter_approved",
    "p8.admin.verification.filter_rejected",
  ]) {
    assert(typeof json[key] === "string", `${locale}.json missing ${key}`);
  }
}

if (errors.length) {
  console.error("verification filter validate FAIL:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("verification filter validate PASS");
