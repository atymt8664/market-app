import assert from "node:assert/strict";
import { resolveOrderThumbnailImageUrl } from "./resolve-order-thumbnail-image-url.ts";

assert.equal(resolveOrderThumbnailImageUrl(null, null), null);
assert.equal(
  resolveOrderThumbnailImageUrl(["https://cdn.example/a.jpg"], null),
  "https://cdn.example/a.jpg",
);
assert.equal(
  resolveOrderThumbnailImageUrl(null, " https://cdn.example/snap.jpg "),
  "https://cdn.example/snap.jpg",
);
assert.equal(
  resolveOrderThumbnailImageUrl([{ url: "https://cdn.example/gallery.jpg" }], "https://cdn.example/snap.jpg"),
  "https://cdn.example/gallery.jpg",
);

console.log("resolve-order-thumbnail-image-url.test.mjs: PASS");
