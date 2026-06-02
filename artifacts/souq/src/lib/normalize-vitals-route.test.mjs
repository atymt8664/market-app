import assert from "node:assert/strict";
import { normalizeVitalsRoute } from "./normalize-vitals-route.ts";

assert.equal(normalizeVitalsRoute("/"), "/");
assert.equal(normalizeVitalsRoute("/admin"), "/admin");
assert.equal(normalizeVitalsRoute("/ad/12345"), "/ad/:id");
assert.equal(normalizeVitalsRoute("/users/42"), "/users/:id");
assert.equal(normalizeVitalsRoute("/search?q=test"), "/search");

console.log("normalize-vitals-route.test.mjs: PASS");
