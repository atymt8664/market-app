import assert from "node:assert/strict";

const TERMINAL_ORDER_STATUSES = ["completed", "cancelled"];
const PUBLIC_LISTING_STATUSES = ["approved"];
const SELLER_MY_ADS_VISIBLE_STATUSES = ["pending", "approved", "rejected"];

function isTerminalOrderStatus(status) {
  return TERMINAL_ORDER_STATUSES.includes(status);
}
function isPublicListingStatus(status) {
  return !!status && PUBLIC_LISTING_STATUSES.includes(status);
}
function isSellerMyAdsVisibleStatus(status) {
  return !!status && SELLER_MY_ADS_VISIBLE_STATUSES.includes(status);
}
function isArchivedListingStatus(status) {
  return status === "archived_by_seller" || status === "retained_for_history";
}
function shouldExposeAdDetailToViewer(status, viewerUserId, ownerUserId) {
  if (isPublicListingStatus(status)) return true;
  if (isArchivedListingStatus(status)) return false;
  const isOwner = viewerUserId !== null && ownerUserId !== null && viewerUserId === ownerUserId;
  if (isOwner && (status === "pending" || status === "rejected")) return true;
  if (isOwner && status === "hidden") return true;
  return false;
}

assert.equal(isTerminalOrderStatus("completed"), true);
assert.equal(isTerminalOrderStatus("shipped"), false);
assert.equal(isPublicListingStatus("approved"), true);
assert.equal(isPublicListingStatus("archived_by_seller"), false);
assert.equal(isSellerMyAdsVisibleStatus("archived_by_seller"), false);
assert.equal(shouldExposeAdDetailToViewer("archived_by_seller", 1, 1), false);
assert.equal(shouldExposeAdDetailToViewer("approved", null, 1), true);

console.log("ad-lifecycle.test.mjs PASS");
