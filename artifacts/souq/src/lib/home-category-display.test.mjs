import assert from "node:assert/strict";
import { splitHomeCategoryLabel } from "./home-category-display.ts";

assert.deepEqual(splitHomeCategoryLabel("السيارات والدراجات"), ["السيارات", "والدراجات"]);
assert.deepEqual(splitHomeCategoryLabel("المنزل والحديقة"), ["المنزل", "والحديقة"]);
assert.deepEqual(splitHomeCategoryLabel("الموضة والجمال"), ["الموضة", "والجمال"]);
assert.deepEqual(splitHomeCategoryLabel("السيارات والدراجات والقوارب"), [
  "السيارات",
  "والدراجات والقوارب",
]);
assert.deepEqual(splitHomeCategoryLabel("العقارات"), ["العقارات"]);
assert.deepEqual(splitHomeCategoryLabel("Fashion & Beauty"), ["Fashion", "& Beauty"]);

console.log("home-category-display.test.mjs: PASS");
