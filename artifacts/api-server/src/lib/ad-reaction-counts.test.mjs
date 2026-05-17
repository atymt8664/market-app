import assert from "node:assert/strict";
import {
  clampCounter,
  counterMapsFromRows,
} from "./ad-reaction-counts-util.ts";

assert.equal(clampCounter(-3), 0);
assert.equal(clampCounter(1.9), 1);
assert.equal(clampCounter(Number.NaN), 0);

const maps = counterMapsFromRows([
  { adId: 1, likeCount: 10, favoriteCount: 2 },
  { adId: 2, likeCount: 0, favoriteCount: 7 },
]);
assert.equal(maps.likeCountByAdId.get(1), 10);
assert.equal(maps.favoriteCountByAdId.get(2), 7);
assert.equal(maps.likeCountByAdId.get(99), undefined);

console.log("ad-reaction-counts.test.mjs: ok");
