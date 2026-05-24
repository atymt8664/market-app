import assert from "node:assert/strict";
import {
  getCachedCategories,
  setCachedCategories,
  getCachedSubcategories,
  setCachedSubcategories,
  invalidateTaxonomyPublicCache,
} from "./taxonomy-public-cache.ts";

process.env.TAXONOMY_PUBLIC_CACHE_MS = "5000";

const sample = [{ id: 1, name: "Test" }];

setCachedCategories(sample);
assert.deepEqual(getCachedCategories(), sample);

setCachedSubcategories(7, [{ id: 2 }]);
assert.deepEqual(getCachedSubcategories(7), [{ id: 2 }]);
assert.equal(getCachedSubcategories(8), null);

invalidateTaxonomyPublicCache();
assert.equal(getCachedCategories(), null);
assert.equal(getCachedSubcategories(7), null);

console.log("taxonomy-public-cache.test.mjs: OK");
