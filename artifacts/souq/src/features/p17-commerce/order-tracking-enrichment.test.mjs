import assert from "node:assert/strict";
import {
  buildShipmentEvents,
  buildTrackingDateChips,
  hasTrackingDetails,
} from "./order-tracking-enrichment.ts";

const baseOrder = {
  createdAt: "2026-06-01T10:00:00.000Z",
  status: "shipped",
  fulfillmentMode: "shipping",
  shipment: {
    carrierLabel: "DHL Paket",
    trackingNumber: "TRK123",
    shippedAt: "2026-06-02T12:00:00.000Z",
    etaAt: "2026-06-05T18:00:00.000Z",
  },
};

const timeline = [
  {
    id: "1",
    eventCode: "order_submitted",
    messageAr: "تم إنشاء الطلب",
    occurredAt: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "2",
    eventCode: "seller_marked_shipped",
    messageAr: "تم الشحن",
    occurredAt: "2026-06-02T12:00:00.000Z",
  },
];

const chips = buildTrackingDateChips(baseOrder, timeline);
assert.equal(chips.length, 3);
assert.equal(chips[0]?.id, "placed");
assert.equal(chips[1]?.id, "shipped");
assert.equal(chips[2]?.id, "eta");

const noEta = buildTrackingDateChips(
  { ...baseOrder, shipment: { ...baseOrder.shipment, etaAt: undefined } },
  timeline,
);
assert.equal(noEta.length, 2);

const events = buildShipmentEvents(baseOrder, timeline);
assert.ok(events.length >= 2);

assert.equal(hasTrackingDetails(baseOrder), true);
assert.equal(hasTrackingDetails({ ...baseOrder, fulfillmentMode: "pickup" }), false);

const pickupChips = buildTrackingDateChips(
  { ...baseOrder, fulfillmentMode: "pickup", shipment: null },
  timeline,
);
assert.equal(pickupChips.length, 1);

console.log("order-tracking-enrichment.test.mjs PASS");
