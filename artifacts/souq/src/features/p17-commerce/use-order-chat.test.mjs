import assert from "node:assert/strict";
import {
  findConversationIdForAd,
  orderChatHref,
} from "./order-chat-nav.ts";

const hrefBuyer = orderChatHref(42, "SOUQ-2026-000001", "buyer", "مرحبًا draft");
assert.ok(hrefBuyer.startsWith("/messages/42?"));
const buyerParams = new URLSearchParams(hrefBuyer.split("?")[1]);
assert.equal(buyerParams.get("from"), "order");
assert.equal(buyerParams.get("orderNumber"), "SOUQ-2026-000001");
assert.equal(buyerParams.get("orderRole"), null);
assert.equal(buyerParams.get("draft"), "مرحبًا draft");

const hrefSeller = orderChatHref(99, "SOUQ-2026-000002", "seller");
const sellerParams = new URLSearchParams(hrefSeller.split("?")[1]);
assert.equal(sellerParams.get("orderRole"), "seller");
assert.equal(sellerParams.get("draft"), null);

const hrefNoDraft = orderChatHref(7, "SOUQ-2026-000003", "buyer");
assert.equal(new URLSearchParams(hrefNoDraft.split("?")[1]).get("draft"), null);

assert.equal(
  findConversationIdForAd(
    [
      { id: 10, adId: 5 },
      { id: 11, adId: 8 },
    ],
    8,
  ),
  11,
);
assert.equal(findConversationIdForAd([{ id: 10, adId: 5 }], 99), null);

console.log("use-order-chat.test.mjs PASS");
