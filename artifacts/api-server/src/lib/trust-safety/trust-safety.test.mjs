import assert from "node:assert/strict";
import test from "node:test";
import {
  adContentChanged,
  adSnapshotFromRow,
  computeAdStatusAfterUserEdit,
  imagesChanged,
  shouldClearFeaturedOnReReview,
} from "./ad-moderation.ts";
import {
  isAllowedReportStatus,
  normalizeReportStatus,
  reportStatusNotificationPayload,
} from "./report-status.ts";
import { avatarPatchAfterUpload, resolvePublicAvatarUrl } from "./avatar-moderation.ts";
import { normalizeDuplicateText } from "./trust-limits.ts";

test("approved ad returns to pending when title changes", () => {
  const before = adSnapshotFromRow({
    title: "A",
    description: "d",
    price: "10",
    priceType: "fixed",
    type: "sell",
    city: "Berlin",
    images: ["/a.jpg"],
    categoryId: 1,
    subcategoryId: null,
    sellerName: "S",
    sellerPhone: "12345",
    details: {},
  });
  const after = { ...before, title: "B" };
  assert.equal(computeAdStatusAfterUserEdit("approved", before, after), "pending");
});

test("approved ad stays approved when nothing changes", () => {
  const snap = adSnapshotFromRow({
    title: "A",
    description: "d",
    price: "10",
    priceType: "fixed",
    type: "sell",
    city: "Berlin",
    images: ["/a.jpg"],
    categoryId: 1,
    subcategoryId: null,
    sellerName: "S",
    sellerPhone: "12345",
    details: {},
  });
  assert.equal(computeAdStatusAfterUserEdit("approved", snap, snap), "approved");
});

test("image change is detected", () => {
  assert.equal(imagesChanged(["/a.jpg"], ["/b.jpg"]), true);
  assert.equal(imagesChanged(["/a.jpg"], ["/a.jpg"]), false);
});

test("featured cleared when re-review triggered", () => {
  assert.equal(shouldClearFeaturedOnReReview("approved", "pending", true), true);
  assert.equal(shouldClearFeaturedOnReReview("approved", "pending", false), false);
});

test("report status normalization", () => {
  assert.equal(normalizeReportStatus("pending"), "open");
  assert.equal(normalizeReportStatus("in_review"), "under_review");
  assert.equal(normalizeReportStatus("ignored"), "rejected");
  assert.equal(isAllowedReportStatus("resolved"), true);
});

test("report notification payload for under_review", () => {
  const payload = reportStatusNotificationPayload("under_review");
  assert.ok(payload);
  assert.equal(payload?.type, "report.reviewing");
});

test("avatar pending hides new url from public viewers", () => {
  const url = resolvePublicAvatarUrl(
    {
      avatarUrl: "/new.jpg",
      avatarApprovedUrl: "/old.jpg",
      avatarPendingReview: true,
    },
    false,
  );
  assert.equal(url, "/old.jpg");
});

test("first avatar upload auto-approved", () => {
  const patch = avatarPatchAfterUpload(
    { avatarUrl: null, avatarApprovedUrl: null, avatarPendingReview: false },
    "/new.jpg",
  );
  assert.equal(patch.avatarPendingReview, false);
  assert.equal(patch.avatarApprovedUrl, "/new.jpg");
});

test("duplicate text normalizer collapses whitespace", () => {
  assert.equal(normalizeDuplicateText("  Hello   World "), "hello world");
});

test("details change triggers re-review", () => {
  const before = adSnapshotFromRow({
    title: "A",
    description: "d",
    price: "10",
    priceType: "fixed",
    type: "sell",
    city: "Berlin",
    images: [],
    categoryId: 1,
    subcategoryId: null,
    sellerName: "S",
    sellerPhone: "12345",
    details: { color: "red" },
  });
  const after = { ...before, details: { color: "blue" } };
  assert.equal(adContentChanged(before, after), true);
});
