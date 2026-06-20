#!/usr/bin/env node
/**
 * Pre-Google-Play stability closure — static wiring checks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..", "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const orderChat = read("artifacts/souq/src/features/p17-commerce/use-order-chat.ts");
assert.ok(
  orderChat.includes("bustConversationThreadCache"),
  "useOpenOrderChat must bust thread cache before prefetch",
);
assert.ok(
  orderChat.includes("bustConversationThreadCache(queryClient, conversationId)"),
  "useOpenOrderChat must bust for both buyer and seller paths",
);

const adDetail = read("artifacts/souq/src/pages/ad-detail.tsx");
assert.ok(adDetail.includes("bustConversationThreadCache"), "ad-detail must bust thread cache");

const touchAd = read("artifacts/api-server/src/lib/conversation-ad-references.ts");
assert.ok(
  touchAd.includes("ne(conversationsTable.id, conversationId)"),
  "touchConversationPrimaryAd must pre-check unique conflict",
);

const adLifecycle = read("artifacts/api-server/src/lib/ad-lifecycle.ts");
assert.ok(
  adLifecycle.includes("adminRemoveListing"),
  "ad-lifecycle must export adminRemoveListing",
);
assert.ok(
  adLifecycle.includes("AD_LIFECYCLE_OUTCOME_HEADER"),
  "ad-lifecycle must define outcome header",
);

const adsRoute = read("artifacts/api-server/src/routes/ads.ts");
assert.ok(
  adsRoute.includes("adminRemoveListing(id)"),
  "admin ads delete must use adminRemoveListing",
);
assert.ok(
  adsRoute.includes("AD_LIFECYCLE_OUTCOME_HEADER"),
  "seller delete must set lifecycle outcome header",
);

const reportsRoute = read("artifacts/api-server/src/routes/admin-reports-workflow.ts");
assert.ok(
  reportsRoute.includes("adminRemoveListing(report.targetAdId)"),
  "report ad delete must use adminRemoveListing",
);
assert.ok(
  !reportsRoute.includes("await db.delete(adsTable).where(eq(adsTable.id, report.targetAdId))"),
  "report workflow must not hard-delete ads unconditionally",
);

const profile = read("artifacts/souq/src/pages/profile.tsx");
assert.ok(profile.includes("removeSellerAd"), "profile must use removeSellerAd for outcome toast");

const en = read("artifacts/souq/src/i18n/locales/en.json");
assert.ok(en.includes("profile.ad_archived"), "en must define profile.ad_archived");
assert.ok(
  en.includes("active purchase orders that are still in progress"),
  "blocked dialog must mention active orders only",
);

console.log("validate-pre-gplay-stability-closure.mjs PASS");
