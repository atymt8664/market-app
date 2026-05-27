import assert from "node:assert/strict";
import {
  CHAT_LOCATION_ACCURACY_TARGET_M,
  canSendChatCurrentLocation,
  chatLocationAccuracyToZoom,
} from "./chat-geolocation-gate.ts";

assert.equal(CHAT_LOCATION_ACCURACY_TARGET_M, 15);
assert.equal(canSendChatCurrentLocation(10), true);
assert.equal(canSendChatCurrentLocation(15), true);
assert.equal(canSendChatCurrentLocation(16), false);
assert.equal(canSendChatCurrentLocation(200), false);
assert.equal(canSendChatCurrentLocation(null), false);
assert.equal(canSendChatCurrentLocation(undefined), false);

assert.equal(chatLocationAccuracyToZoom(10), 18);
assert.equal(chatLocationAccuracyToZoom(30), 16);
assert.equal(chatLocationAccuracyToZoom(100), 15);
assert.equal(chatLocationAccuracyToZoom(500), 13);
assert.equal(chatLocationAccuracyToZoom(null), 13);

console.log("chat-geolocation.test.mjs: PASS");
