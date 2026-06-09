import assert from "node:assert/strict";

/** Mirrors orders-repository.ts — keep in sync (no @workspace/db import in tests). */
function firstAdImage(images) {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === "string" && item.trim().length > 0) return item.trim();
    if (item && typeof item === "object" && "url" in item) {
      const url = item.url;
      if (typeof url === "string" && url.trim().length > 0) return url.trim();
    }
  }
  return null;
}

function resolveOrderListImage(itemImageUrl, adImages) {
  if (itemImageUrl?.trim()) return itemImageUrl.trim();
  return firstAdImage(adImages);
}

assert.equal(firstAdImage(["https://cdn.example/a.jpg"]), "https://cdn.example/a.jpg");
assert.equal(
  firstAdImage([{ url: "https://cdn.example/b.jpg" }]),
  "https://cdn.example/b.jpg",
);
assert.equal(
  resolveOrderListImage(null, [{ url: "https://cdn.example/c.jpg" }]),
  "https://cdn.example/c.jpg",
);
assert.equal(
  resolveOrderListImage("https://cdn.example/snapshot.jpg", [{ url: "https://cdn.example/ad.jpg" }]),
  "https://cdn.example/snapshot.jpg",
);

console.log("orders-list-image.test.mjs: PASS");
