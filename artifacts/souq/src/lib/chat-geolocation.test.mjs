import assert from "node:assert/strict";
import {
  CHAT_LOCATION_ACCURACY_PRECISE_M,
  chatLocationAccuracyToZoom,
} from "./chat-geolocation-gate.ts";

assert.equal(CHAT_LOCATION_ACCURACY_PRECISE_M, 15);
assert.equal(chatLocationAccuracyToZoom(10), 18);
assert.equal(chatLocationAccuracyToZoom(15), 18);
assert.equal(chatLocationAccuracyToZoom(30), 16);
assert.equal(chatLocationAccuracyToZoom(100), 15);
assert.equal(chatLocationAccuracyToZoom(500), 13);
assert.equal(chatLocationAccuracyToZoom(null), 13);

console.log("chat-geolocation.test.mjs: PASS");
