import assert from "node:assert/strict";
import { chatLocationAccuracyToZoom } from "./chat-location-session.ts";

assert.equal(chatLocationAccuracyToZoom(10), 18);
assert.equal(chatLocationAccuracyToZoom(120), 15);
assert.equal(chatLocationAccuracyToZoom(500), 14);
assert.equal(chatLocationAccuracyToZoom(null), 14);

console.log("chat-location-session.test.mjs: PASS");
