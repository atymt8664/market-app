import assert from "node:assert/strict";
import { splitHomeCategoryLabel, filterHomeCategories } from "./home-category-display.ts";

assert.deepEqual(splitHomeCategoryLabel("السيارات والدراجات"), ["السيارات", "والدراجات"]);
assert.deepEqual(splitHomeCategoryLabel("المنزل والحديقة"), ["المنزل", "والحديقة"]);
assert.deepEqual(splitHomeCategoryLabel("الموضة والجمال"), ["الموضة", "والجمال"]);
assert.deepEqual(splitHomeCategoryLabel("السيارات والدراجات والقوارب"), [
  "السيارات",
  "والدراجات والقوارب",
]);
assert.deepEqual(splitHomeCategoryLabel("العقارات"), ["العقارات"]);
assert.deepEqual(splitHomeCategoryLabel("Fashion & Beauty"), ["Fashion", "& Beauty"]);

const withTest = [
  { id: "1", name: "الإلكترونيات" },
  { id: "t", name: "Test Cat 1777565550" },
  { id: "2", name: "العقارات" },
];
assert.deepEqual(filterHomeCategories(withTest), [
  { id: "1", name: "الإلكترونيات" },
  { id: "2", name: "العقارات" },
]);
assert.equal(filterHomeCategories(undefined), undefined);

console.log("home-category-display.test.mjs: PASS");
