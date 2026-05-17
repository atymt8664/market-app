import assert from "node:assert/strict";
import {
  normalizeSearchQuery,
  normalizeCityFilter,
  AD_SEARCH_MAX_LEN,
} from "./ad-search-util.ts";

assert.equal(normalizeSearchQuery(""), null);
assert.equal(normalizeSearchQuery("  "), null);
assert.equal(normalizeSearchQuery("  iphone  "), "iphone");
assert.equal(normalizeSearchQuery("a".repeat(AD_SEARCH_MAX_LEN + 10))?.length, AD_SEARCH_MAX_LEN);

assert.equal(normalizeCityFilter(" Berlin "), "Berlin");
assert.equal(normalizeCityFilter(""), null);

console.log("ad-search-util.test.mjs: ok");
