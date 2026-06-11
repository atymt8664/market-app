import assert from "node:assert/strict";
import {
  broadcastDedupKey,
  isBroadcastCategory,
  resolveBroadcastNotificationType,
} from "./catalog.ts";

assert.ok(isBroadcastCategory("platform_update"));
assert.ok(!isBroadcastCategory("spam"));
assert.equal(
  resolveBroadcastNotificationType("security_alert"),
  "announcement.platform.security",
);
assert.equal(broadcastDedupKey(42, 7), "broadcast:42:7");
assert.match(broadcastDedupKey(1, 2), /^broadcast:1:2$/);

console.log("platform-broadcasts/catalog.test.mjs: PASS");
