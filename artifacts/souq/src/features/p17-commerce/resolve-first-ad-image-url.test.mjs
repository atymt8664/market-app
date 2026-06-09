import assert from "node:assert/strict";
import { resolveFirstAdImageUrl } from "./resolve-first-ad-image-url.ts";

assert.equal(resolveFirstAdImageUrl(null), null);
assert.equal(resolveFirstAdImageUrl(["  "]), null);
assert.equal(resolveFirstAdImageUrl(["https://cdn.example/a.jpg"]), "https://cdn.example/a.jpg");
assert.equal(
  resolveFirstAdImageUrl([{ url: "https://cdn.example/b.jpg" }]),
  "https://cdn.example/b.jpg",
);
assert.equal(
  resolveFirstAdImageUrl(["", { url: "https://cdn.example/c.jpg" }]),
  "https://cdn.example/c.jpg",
);

console.log("resolve-first-ad-image-url.test.mjs: PASS");
