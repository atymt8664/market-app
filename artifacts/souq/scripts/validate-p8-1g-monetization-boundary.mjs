#!/usr/bin/env node
/**
 * P8-1G — Monetization / billing / plans boundary validation.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MONETIZATION_BOUNDARY_SURFACES,
} from "../src/lib/monetization-boundary.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const BOUNDARY_DOC = join(repoRoot, "docs", "architecture", "P08-billing-plans-boundary.md");
assert(existsSync(BOUNDARY_DOC), "missing docs/architecture/P08-billing-plans-boundary.md");

const WIRED = {
  "admin.billing": "src/pages/admin-billing.tsx",
  "admin.plans": "src/pages/admin-plans.tsx",
  "admin.verification_ops": "src/pages/admin-verification.tsx",
  "user.promote": "src/pages/promote-ad.tsx",
  "user.promote_preview": "src/pages/promote-preview.tsx",
  "user.pro_seller": "src/pages/professional-seller.tsx",
  "user.payments": "src/pages/account-info.tsx",
  "user.verification_preview": "src/pages/account-verification.tsx",
  "user.trust_score": "src/pages/seller-trust.tsx",
};

for (const surface of MONETIZATION_BOUNDARY_SURFACES) {
  assert(WIRED[surface], `registry surface not in WIRED map: ${surface}`);
}

for (const [surface, rel] of Object.entries(WIRED)) {
  const path = join(root, rel);
  assert(existsSync(path), `missing wired file: ${rel}`);
  const content = readFileSync(path, "utf8");
  assert(
    content.includes("p10PreviewAttrs") && content.includes(`"${surface}"`),
    `${rel}: missing p10PreviewAttrs for ${surface}`,
  );
}

const billing = readFileSync(join(root, WIRED["admin.billing"]), "utf8");
assert(billing.includes("p8.admin.billing.alert"), "admin-billing: missing billing.alert banner");
assert(billing.includes("p8.admin.billing.filter.hint"), "admin-billing: missing filter.hint");

const verification = readFileSync(join(root, WIRED["admin.verification_ops"]), "utf8");
assert(verification.includes("p8VerificationOpsAttrs"), "admin-verification: missing ops marker");
assert(verification.includes("boundary_user_submit"), "admin-verification: missing boundary note");

const promoteBody = readFileSync(join(root, "src/components/promote-ad-marketing-body.tsx"), "utf8");
assert(promoteBody.includes("MonetizationPreviewBanner"), "promote-ad-marketing-body: missing preview banner");
assert(promoteBody.includes("promote.pay_disabled"), "promote-ad-marketing-body: pay button must stay disabled");

const souqSrc = join(root, "src");
function scanNoBillingApi(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules") continue;
      scanNoBillingApi(p);
      continue;
    }
    if (!/\.(tsx?|jsx?|mjs)$/.test(name)) continue;
    const text = readFileSync(p, "utf8");
    assert(!text.includes("/api/admin/billing"), `${p}: must not call /api/admin/billing`);
    assert(!text.includes("/api/admin/plans"), `${p}: must not call /api/admin/plans`);
  }
}
scanNoBillingApi(souqSrc);

const I18N_KEYS = [
  "p10.monetization.boundary.preview_banner",
  "p8.admin.verification.boundary_user_submit",
  "p8.admin.plans.alert_no_payment",
  "p8.admin.billing.disconnected_title",
];
for (const locale of ["ar", "en", "de"]) {
  const json = JSON.parse(readFileSync(join(root, "src/i18n/locales", `${locale}.json`), "utf8"));
  for (const key of I18N_KEYS) {
    assert(typeof json[key] === "string" && json[key].length > 0, `${locale}.json: missing ${key}`);
  }
}

if (errors.length) {
  console.error("[P8-1G Monetization Boundary] FAIL");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `[P8-1G Monetization Boundary] PASS — ${MONETIZATION_BOUNDARY_SURFACES.length} surfaces wired`,
);
