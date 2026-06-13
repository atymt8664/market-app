import assert from "node:assert/strict";
import {
  computeHomeFeedReady,
  isFeaturedQuerySettled,
  isRecommendedQuerySettled,
  shouldShowCategoryPlaceholders,
  categoriesQueryFailed,
  shouldReserveBellColumn,
  shouldShowBellSettledShell,
} from "./home-query-recovery.ts";

assert.equal(isFeaturedQuerySettled(true, false), true);
assert.equal(isFeaturedQuerySettled(false, true), true);
assert.equal(isFeaturedQuerySettled(false, false), false);

assert.equal(
  isRecommendedQuerySettled(undefined, false, undefined, false, true, false),
  true,
);
assert.equal(
  isRecommendedQuerySettled("Berlin", true, [], true, true, false),
  true,
);

assert.equal(computeHomeFeedReady(true, true, false), true);
assert.equal(computeHomeFeedReady(true, false, false), false);
assert.equal(computeHomeFeedReady(true, false, true), true);

assert.equal(shouldShowCategoryPlaceholders(undefined, false, false, true), true);
assert.equal(shouldShowCategoryPlaceholders(undefined, false, false, false), true);
assert.equal(shouldShowCategoryPlaceholders([], false, false, false), false);

assert.equal(categoriesQueryFailed(undefined, true, false), true);
assert.equal(categoriesQueryFailed([], true, false), false);

assert.equal(shouldReserveBellColumn(false, true, false, false), true);
assert.equal(shouldShowBellSettledShell(false, true, false, false), true);

console.log("home-query-recovery.test.mjs: PASS");
