import assert from "node:assert/strict";
import { resolveBuyerCancelledStatusLabel } from "./order-labels.ts";

assert.equal(
  resolveBuyerCancelledStatusLabel(["order_submitted", "seller_rejected_order"]),
  "تم رفض الطلب من البائع",
);
assert.equal(
  resolveBuyerCancelledStatusLabel(["order_submitted", "buyer_cancelled_order"]),
  "تم إلغاء الطلب",
);
assert.equal(resolveBuyerCancelledStatusLabel(["order_submitted"]), "ملغى");

console.log("order-labels-buyer-cancel.test.mjs PASS");
