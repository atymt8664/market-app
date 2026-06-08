import assert from "node:assert/strict";
import {
  P17_CARRIER_CATALOG,
  buildCarrierTrackingUrl,
  resolveCarrierProfile,
} from "./order-tracking-carrier-readiness.ts";

assert.equal(P17_CARRIER_CATALOG.length, 9);

const dhl = resolveCarrierProfile("DHL Paket", "shipping");
assert.equal(dhl.code, "dhl_paket");
assert.equal(dhl.webhookReady, false);

const hermes = resolveCarrierProfile("Hermes Päckchen", "shipping");
assert.equal(hermes.code, "hermes_packchen");

const pickup = resolveCarrierProfile("DHL Paket", "pickup");
assert.equal(pickup.code, "pickup_only");

const url = buildCarrierTrackingUrl(dhl, "1234567890");
assert.ok(url?.includes("1234567890"));

const other = resolveCarrierProfile("Custom Carrier", "shipping");
assert.equal(other.code, "other");
assert.equal(buildCarrierTrackingUrl(other, "ABC"), null);

console.log("order-tracking-carrier-readiness.test.mjs PASS");
