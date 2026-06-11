import assert from "node:assert/strict";
import {
  filterNotificationCenterRows,
  isExcludedFromNotificationCenter,
} from "./notification-center-filter.ts";

assert.equal(isExcludedFromNotificationCenter("message.received"), true);
assert.equal(isExcludedFromNotificationCenter("chat.thread"), true);
assert.equal(isExcludedFromNotificationCenter("order.created"), false);
assert.equal(isExcludedFromNotificationCenter("ad.approved"), false);

const rows = [
  { id: 1, type: "message.received" },
  { id: 2, type: "order.created" },
  { id: 3, type: "ad.approved" },
];
assert.deepEqual(filterNotificationCenterRows(rows).map((r) => r.id), [2, 3]);

console.log("notification-center-filter.test.mjs: PASS");
