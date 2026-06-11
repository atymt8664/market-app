import assert from "node:assert/strict";
import {
  buildMessageReceivedCopy,
  sanitizeSenderNameForLockScreen,
} from "./message-notification-copy.ts";

assert.equal(sanitizeSenderNameForLockScreen("  محمد  "), "محمد");
assert.equal(sanitizeSenderNameForLockScreen("a@b.com"), null);
assert.equal(sanitizeSenderNameForLockScreen("+49123456789"), null);
assert.equal(sanitizeSenderNameForLockScreen("x"), null);

const generic = buildMessageReceivedCopy(null);
assert.equal(generic.title, "Souq Arab EU");
assert.ok(generic.body.includes("رسالة جديدة"));

const named = buildMessageReceivedCopy("أحمد");
assert.equal(named.title, "Souq Arab EU");
assert.equal(named.body, "رسالة جديدة من أحمد");

console.log("message-notifications.test.mjs: OK");
