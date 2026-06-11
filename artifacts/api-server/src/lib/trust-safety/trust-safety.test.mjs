import assert from "node:assert/strict";
import test from "node:test";
import {
  adContentChanged,
  adSnapshotFromRow,
  computeAdStatusAfterUserEdit,
  imagesChanged,
  shouldClearFeaturedOnReReview,
} from "./ad-moderation.ts";
import { getAdminPresetsForContext } from "../communications/admin-presets.ts";
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

test("report resolved without reason uses generic template", () => {
  const payload = reportStatusNotificationPayload("resolved");
  assert.ok(payload);
  assert.equal(payload?.type, "report.resolved");
  assert.ok(payload.body.includes("تم اتخاذ الإجراء المناسب بعد مراجعة البلاغ"));
});

test("each report closure preset produces distinct resolved notification body", () => {
  const presets = getAdminPresetsForContext("reports");
  const bodies = new Set();
  for (const preset of presets) {
    const payload = reportStatusNotificationPayload("resolved", preset);
    assert.ok(payload, `missing payload for preset: ${preset}`);
    assert.equal(payload.type, "report.resolved");
    assert.ok(!payload.body.includes("{{reason}}"), `unresolved placeholder for: ${preset}`);
    bodies.add(payload.body);
  }
  assert.equal(bodies.size, presets.length, "resolved bodies must differ per preset");
});

test("each report closure preset produces distinct rejected notification body", () => {
  const presets = getAdminPresetsForContext("reports");
  const bodies = new Set();
  for (const preset of presets) {
    const payload = reportStatusNotificationPayload("rejected", preset);
    assert.ok(payload, `missing payload for preset: ${preset}`);
    assert.equal(payload.type, "report.rejected");
    assert.ok(!payload.body.includes("{{reason}}"), `unresolved placeholder for: ${preset}`);
    bodies.add(payload.body);
  }
  assert.equal(bodies.size, presets.length, "rejected bodies must differ per preset");
});

test("no_violation resolved copy matches reviewer outcome", () => {
  const payload = reportStatusNotificationPayload("resolved", "لم يتم العثور على مخالفة.");
  assert.ok(payload);
  assert.equal(payload.title, "✅ تمت مراجعة البلاغ");
  assert.ok(payload.body.includes("لم نجد أي مخالفة لسياسات المنصة"));
  assert.ok(payload.body.includes("شكراً لمساهمتك في حماية مجتمع Souq Arab EU. 🛡️"));
});

test("content_removed resolved copy matches reviewer outcome", () => {
  const payload = reportStatusNotificationPayload("resolved", "تمت إزالة المحتوى المخالف.");
  assert.equal(payload?.title, "🚫 تمت إزالة المحتوى المخالف");
  assert.ok(payload?.body.includes("تم حذف المحتوى المخالف واتخاذ الإجراء المناسب"));
});

test("user_warned resolved copy matches reviewer outcome", () => {
  const payload = reportStatusNotificationPayload("resolved", "تم تحذير المستخدم.");
  assert.equal(payload?.title, "⚠️ تم اتخاذ إجراء بحق المستخدم");
  assert.ok(payload?.body.includes("توجيه تحذير للمستخدم المخالف"));
});

test("account_suspended resolved copy matches reviewer outcome", () => {
  const payload = reportStatusNotificationPayload("resolved", "تم تعليق الحساب.");
  assert.equal(payload?.title, "⛔ تم اتخاذ إجراء أمني");
  assert.ok(payload?.body.includes("تم تعليق الحساب المخالف وفق سياسات المنصة"));
});

test("custom report closure reason is included in notification body", () => {
  const custom = "تم التواصل مع الطرفين وإغلاق البلاغ بعد التوضيح.";
  const payload = reportStatusNotificationPayload("resolved", custom);
  assert.ok(payload);
  assert.ok(payload.body.includes(custom));
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
