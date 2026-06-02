import assert from "node:assert/strict";
import { isHomePathname } from "./p7-home-path.ts";

assert.equal(isHomePathname("/"), true);
assert.equal(isHomePathname(""), true);
assert.equal(isHomePathname("/admin"), false);
assert.equal(isHomePathname("/admin/"), false);
assert.equal(isHomePathname("/ad/123"), false);
assert.equal(isHomePathname("/categories"), false);
assert.equal(isHomePathname("/search"), false);
assert.equal(isHomePathname("/login"), false);

console.log("p7-home-path.test.mjs: PASS");
