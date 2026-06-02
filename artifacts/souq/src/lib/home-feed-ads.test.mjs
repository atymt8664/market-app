import assert from "node:assert/strict";
import {
  buildHomeRecommendedFeed,
  collectFeaturedAdIds,
  excludeFeaturedFromRecommended,
  filterHomeFeedAds,
  isHomeTestAd,
} from "./home-feed-ads.ts";

assert.equal(isHomeTestAd({ title: "csrf t" }), true);
assert.equal(isHomeTestAd({ title: "Real listing title" }), false);

const withTest = [
  { id: 1, title: "Valid ad" },
  { id: 2, title: "csrf t" },
];
assert.deepEqual(filterHomeFeedAds(withTest), [{ id: 1, title: "Valid ad" }]);

const featured = [{ id: 10 }, { id: 20 }];
const recommended = [{ id: 20 }, { id: 30 }, { id: 40 }];
assert.deepEqual(collectFeaturedAdIds(featured), new Set([10, 20]));
assert.deepEqual(excludeFeaturedFromRecommended(recommended, new Set([20])), [
  { id: 30 },
  { id: 40 },
]);

const deduped = buildHomeRecommendedFeed(
  [{ id: 10 }, { id: 20 }, { id: 30 }],
  featured,
);
assert.deepEqual(deduped, [{ id: 30 }]);

assert.deepEqual(
  buildHomeRecommendedFeed([{ id: 10 }, { id: 20 }, { id: 30, title: "csrf t" }], featured),
  [],
);

assert.deepEqual(buildHomeRecommendedFeed(undefined, featured), []);
assert.deepEqual(buildHomeRecommendedFeed([{ id: 5 }], []), [{ id: 5 }]);

console.log("home-feed-ads.test.mjs: PASS");
