import assert from "node:assert/strict";
import { mergeAdListRows } from "./ads-list-merge.ts";

function adRow(id) {
  return {
    ads: {
      id,
      title: `ad-${id}`,
      createdAt: new Date(`2024-01-${String(id).padStart(2, "0")}T00:00:00.000Z`),
    },
    categoryName: "cat",
    subcategoryName: null,
  };
}

// Guest: no likes — all zeros/false
const guest = mergeAdListRows(
  [3, 1, 2],
  [adRow(1), adRow(2), adRow(3)],
  new Map(),
  new Map(),
  new Set(),
  new Set(),
);
assert.equal(guest.length, 3);
assert.equal(guest[0].ads.id, 3);
assert.equal(guest[0].likeCount, 0);
assert.equal(guest[0].isLiked, false);

// Logged-in: counts + flags
const loggedIn = mergeAdListRows(
  [10, 20],
  [adRow(10), adRow(20)],
  new Map([[10, 5], [20, 0]]),
  new Map([[10, 2], [20, 7]]),
  new Set([10]),
  new Set([20]),
);
assert.equal(loggedIn[0].likeCount, 5);
assert.equal(loggedIn[0].favoriteCount, 2);
assert.equal(loggedIn[0].isLiked, true);
assert.equal(loggedIn[0].isFavorited, false);
assert.equal(loggedIn[1].isLiked, false);
assert.equal(loggedIn[1].isFavorited, true);
assert.equal(loggedIn[1].favoriteCount, 7);

// Missing ad in core rows is skipped (no duplicate phantom rows)
const partial = mergeAdListRows(
  [1, 99, 2],
  [adRow(1), adRow(2)],
  new Map([[1, 1]]),
  new Map(),
  new Set(),
  new Set(),
);
assert.equal(partial.length, 2);
assert.deepEqual(
  partial.map((r) => r.ads.id),
  [1, 2],
);

console.log("ads-list-query.test.mjs: ok");
