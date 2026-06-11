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
assert.equal(generic.title, "رسالة جديدة");
assert.ok(generic.body.includes("Souq Arab EU"));

const named = buildMessageReceivedCopy("أحمد");
assert.equal(named.title, "رسالة جديدة من أحمد");
assert.equal(named.body, "افتح المحادثة للرد.");

console.log("message-notifications.test.mjs: OK");
