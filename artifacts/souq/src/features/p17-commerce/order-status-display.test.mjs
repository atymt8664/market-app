import assert from "node:assert/strict";
import { resolveBuyerStatusLabel } from "./order-status-display.ts";

const base = { status: "confirmed", statusLabelAr: "تم تأكيد الطلب من البائع" };
assert.equal(resolveBuyerStatusLabel(base, []), base.statusLabelAr);

const cancelled = { status: "cancelled", statusLabelAr: "ملغى" };
assert.equal(
  resolveBuyerStatusLabel(cancelled, [{ id: "1", eventCode: "seller_rejected_order", messageAr: "", occurredAt: "" }]),
  "تم رفض الطلب من البائع",
);
assert.equal(
  resolveBuyerStatusLabel(cancelled, [{ id: "2", eventCode: "buyer_cancelled_order", messageAr: "", occurredAt: "" }]),
  "تم إلغاء الطلب",
);
assert.equal(resolveBuyerStatusLabel(cancelled, undefined), "ملغى");

console.log("order-status-display.test.mjs PASS");
