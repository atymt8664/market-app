/**
 * Static wiring checks for chat conversation consolidation (no API/DB required).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const apiRoot = join(root, "artifacts", "api-server");
const souqRoot = join(root, "artifacts", "souq");

const requiredFiles = [
  [root, "lib/db/migrations/029_conversation_ad_references.sql"],
  [apiRoot, "src/lib/conversation-ad-references.ts"],
  [apiRoot, "src/lib/chat-ad-reference-message.ts"],
  [apiRoot, "scripts/validate-chat-conversation-consolidation.mjs"],
  [souqRoot, "src/components/chat-conversation-ads-bar.tsx"],
  [souqRoot, "src/components/chat-conversation-ads-sheet.tsx"],
  [souqRoot, "src/components/chat-ad-reference-message-content.tsx"],
  [souqRoot, "src/lib/chat-ad-reference-message.ts"],
];

for (const [base, rel] of requiredFiles) {
  assert.ok(existsSync(join(base, rel)), `missing ${rel}`);
}

const conversations = readFileSync(join(apiRoot, "src/routes/conversations.ts"), "utf8");
assert.ok(conversations.includes("findBuyerSellerConversation"), "POST must use buyer+seller lookup");
assert.ok(conversations.includes("conversationAdReferencesTable"), "must use ad references table");
assert.ok(conversations.includes("distinct on (other_id)"), "inbox must dedupe by peer");
assert.ok(conversations.includes("referencedAdId"), "send message must support referencedAdId");
assert.ok(conversations.includes("referencedAds"), "GET detail must return referencedAds");

const thread = readFileSync(join(souqRoot, "src/pages/message-thread.tsx"), "utf8");
assert.ok(thread.includes("ChatConversationAdsBar"), "thread must use ads bar");
assert.ok(!thread.includes("ChatProductContextBar"), "old product context bar must be removed");
assert.ok(thread.includes("ChatAdReferenceMessageContent"), "thread must render ad reference bubbles");
assert.ok(thread.includes("referencedAdId"), "thread must send referencedAdId on ad select");

for (const locale of ["ar", "en", "de"]) {
  const json = readFileSync(join(souqRoot, `src/i18n/locales/${locale}.json`), "utf8");
  assert.ok(json.includes("message_thread.ads_bar_label"), `${locale}: ads_bar_label missing`);
  assert.ok(json.includes("message_thread.ad_reference_lead_mine"), `${locale}: ad_reference_lead_mine missing`);
}

const schema = readFileSync(join(root, "lib/db/src/schema/messages.ts"), "utf8");
assert.ok(schema.includes("conversationAdReferencesTable"), "schema must define ad references table");

console.log("validate-chat-conversation-consolidation-static.mjs: PASS");
