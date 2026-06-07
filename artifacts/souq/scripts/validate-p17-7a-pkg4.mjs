#!/usr/bin/env node
/**
 * P17-7A Package 4 — Order chat integration (static + unit, no network).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (m) => console.log(`  OK  ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  fail = 1;
};

const chat = readFileSync(join(root, "src/features/p17-commerce/use-order-chat.ts"), "utf8");
const nav = readFileSync(join(root, "src/features/p17-commerce/order-chat-nav.ts"), "utf8");
if (nav.includes("orderChatHref") && nav.includes("findConversationIdForAd")) {
  ok("order-chat-nav pure helpers");
} else bad("order-chat-nav missing");
if (chat.includes("buildOrderChatDraft") && chat.includes("order_created_draft")) {
  ok("buyer draft via i18n key");
} else bad("buyer draft missing");
if (chat.includes('orderRole !== "seller"') && chat.includes("withDraft")) {
  ok("seller opens without draft");
} else bad("seller draft guard missing");
if (chat.includes("findConversationIdForAd") && chat.includes("listConversations")) {
  ok("seller reuses existing conversation list");
} else bad("seller conversation reuse missing");
if (nav.includes('params.set("draft"')) ok("draft query param");
else bad("draft param missing");
if (nav.includes('from: "order"')) ok("from=order navigation");
else bad("from=order missing");

const created = readFileSync(join(root, "src/pages/order-created.tsx"), "utf8");
if (created.includes("useOpenOrderChat") && created.includes("orderChat.open")) {
  ok("order-created chat CTA");
} else bad("order-created chat missing");

const detail = readFileSync(join(root, "src/features/p17-commerce/order-detail-page.tsx"), "utf8");
if (detail.includes("useOpenOrderChat") && detail.includes("buyer_action_contact_seller")) {
  ok("buyer order detail chat CTA");
} else bad("buyer detail chat missing");

const sellerActions = readFileSync(join(root, "src/features/p17-commerce/seller-order-actions.tsx"), "utf8");
if (sellerActions.includes('orderChat.open(order.adId, order.orderNumber, "seller")')) {
  ok("seller order detail chat CTA");
} else bad("seller detail chat missing");

const thread = readFileSync(join(root, "src/pages/message-thread.tsx"), "utf8");
if (thread.includes("draftFromUrl") && thread.includes("replace: true")) {
  ok("message-thread draft prefill (P5 — unchanged)");
} else bad("message-thread draft contract missing");
if (thread.includes("OrderChatContextBanner")) ok("order chat banner");
else bad("order chat banner missing");

for (const loc of ["ar.json", "en.json", "de.json"]) {
  const j = readFileSync(join(root, `src/i18n/locales/${loc}`), "utf8");
  if (j.includes("p17.commerce.chat.order_created_draft") && j.includes("p17.commerce.chat.seller_no_thread")) {
    ok(`i18n ${loc} chat keys`);
  } else bad(`i18n ${loc} missing chat keys`);
}

const unit = spawnSync(
  process.execPath,
  ["--experimental-strip-types", join(root, "src/features/p17-commerce/use-order-chat.test.mjs")],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (unit.status !== 0) {
  bad("use-order-chat.test.mjs");
  process.exit(unit.status ?? 1);
}

if (fail === 0) {
  console.log("\np17-7a:pkg4:validate PASS");
  process.exit(0);
}
console.log("\np17-7a:pkg4:validate FAIL");
process.exit(1);
