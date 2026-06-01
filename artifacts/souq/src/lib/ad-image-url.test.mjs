import assert from "node:assert/strict";
import {
  getAdImageUrl,
  getAdImageOriginalUrl,
  getAdImageHeroUrl,
  getAdImageThumbUrl,
  getAdImageFeedUrl,
} from "./ad-image-url.ts";

const ORIGINAL =
  "https://example.supabase.co/storage/v1/object/public/uploads/ads/1/photo.jpg";

assert.equal(
  getAdImageThumbUrl(ORIGINAL),
  "https://example.supabase.co/storage/v1/render/image/public/uploads/ads/1/photo.jpg?width=136&height=136&resize=cover&quality=75",
);

assert.equal(
  getAdImageHeroUrl(ORIGINAL),
  "https://example.supabase.co/storage/v1/render/image/public/uploads/ads/1/photo.jpg?width=820&height=615&resize=cover&quality=80",
);

assert.equal(
  getAdImageFeedUrl(ORIGINAL),
  "https://example.supabase.co/storage/v1/render/image/public/uploads/ads/1/photo.jpg?width=400&height=300&resize=cover&quality=75",
);

const thumb = getAdImageThumbUrl(ORIGINAL);
assert.equal(getAdImageOriginalUrl(thumb), ORIGINAL);
assert.equal(getAdImageHeroUrl(thumb), getAdImageHeroUrl(ORIGINAL));

assert.equal(
  getAdImageUrl("https://cdn.example.com/photo.jpg", "hero"),
  "https://cdn.example.com/photo.jpg",
);

console.log("ad-image-url.test.mjs: ok");
