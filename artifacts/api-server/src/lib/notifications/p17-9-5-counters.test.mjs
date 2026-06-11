import assert from "node:assert/strict";
import {
  BADGE_COUNT_DISPLAY_CAP,
  clampBadgeCount,
  computeAppBadgeTotal,
  formatBadgeCount,
} from "./badge-counters";

assert.equal(computeAppBadgeTotal(3, 5), 8);
assert.equal(computeAppBadgeTotal(-1, 2), 2);
assert.equal(computeAppBadgeTotal(1.9, 2.1), 3);

assert.equal(formatBadgeCount(0), "0");
assert.equal(formatBadgeCount(42), "42");
assert.equal(formatBadgeCount(100), "99+");
assert.equal(formatBadgeCount(BADGE_COUNT_DISPLAY_CAP), "99");
assert.equal(formatBadgeCount(BADGE_COUNT_DISPLAY_CAP + 1), "99+");

assert.equal(clampBadgeCount(150), 99);
assert.equal(clampBadgeCount(-5), 0);

console.log("p17-9-5-counters.test.mjs: OK");
