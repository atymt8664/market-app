/**
 * P4 + P17 — Listing lifecycle & retention (SSOT for ad status semantics).
 * @see docs/architecture/P17-listing-lifecycle-retention.md
 */
import { db, adsTable, ordersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

/** Canonical lifecycle states stored in `ads.status` (text column — no enum migration). */
export const AD_LIFECYCLE_STATUS = {
  /** Awaiting moderation. */
  PENDING: "pending",
  /** Active public listing. */
  APPROVED: "approved",
  REJECTED: "rejected",
  /** Admin moderation hide — distinct from seller archive. */
  HIDDEN: "hidden",
  /** Seller removed listing with terminal order history retained (FK-safe). */
  ARCHIVED_BY_SELLER: "archived_by_seller",
  /** Future P15 retention tier — compliance hold before eligible_for_cleanup. */
  RETAINED_FOR_HISTORY: "retained_for_history",
} as const;

export type AdLifecycleStatus = (typeof AD_LIFECYCLE_STATUS)[keyof typeof AD_LIFECYCLE_STATUS];

/** Visible on home, search, public profile, anonymous ad detail. */
export const PUBLIC_LISTING_STATUSES = [AD_LIFECYCLE_STATUS.APPROVED] as const;

/** Shown in seller «إعلاناتي» / GET /api/ads/mine. */
export const SELLER_MY_ADS_VISIBLE_STATUSES = [
  AD_LIFECYCLE_STATUS.PENDING,
  AD_LIFECYCLE_STATUS.APPROVED,
  AD_LIFECYCLE_STATUS.REJECTED,
] as const;

/** Terminal order states — safe to archive linked listing (no active commerce). */
export const TERMINAL_ORDER_STATUSES = ["completed", "cancelled"] as const;

export function isPublicListingStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PUBLIC_LISTING_STATUSES as readonly string[]).includes(status);
}

export function isSellerMyAdsVisibleStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (SELLER_MY_ADS_VISIBLE_STATUSES as readonly string[]).includes(status);
}

export function isArchivedListingStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (
    status === AD_LIFECYCLE_STATUS.ARCHIVED_BY_SELLER ||
    status === AD_LIFECYCLE_STATUS.RETAINED_FOR_HISTORY
  );
}

export function isTerminalOrderStatus(status: string): boolean {
  return (TERMINAL_ORDER_STATUSES as readonly string[]).includes(status);
}

export type SellerRemoveAdResult =
  | { outcome: "hard_deleted" }
  | { outcome: "archived"; status: typeof AD_LIFECYCLE_STATUS.ARCHIVED_BY_SELLER }
  | { outcome: "blocked_active_orders"; linkedOrders: number }
  | { outcome: "not_found" }
  | { outcome: "forbidden" };

/**
 * Seller «delete» semantics:
 * - No orders → hard DELETE (existing behaviour).
 * - Active orders → 409 AD_DELETE_LINKED_ORDERS.
 * - Terminal orders only → archive (retain row for orders FK + audit).
 */
export async function sellerRemoveListing(
  adId: number,
  sellerUserId: number,
): Promise<SellerRemoveAdResult> {
  const existing = await db
    .select({ userId: adsTable.userId, status: adsTable.status })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  const row = existing[0];
  if (!row) return { outcome: "not_found" };
  if (row.userId !== sellerUserId) return { outcome: "forbidden" };
  if (isArchivedListingStatus(row.status)) {
    return { outcome: "archived", status: AD_LIFECYCLE_STATUS.ARCHIVED_BY_SELLER };
  }

  const linkedOrders = await db
    .select({ status: ordersTable.status })
    .from(ordersTable)
    .where(eq(ordersTable.adId, adId));

  const hasActiveLinkedOrder = linkedOrders.some((o) => !isTerminalOrderStatus(o.status));
  if (hasActiveLinkedOrder) {
    return { outcome: "blocked_active_orders", linkedOrders: linkedOrders.length };
  }

  if (linkedOrders.length > 0) {
    await db
      .update(adsTable)
      .set({
        status: AD_LIFECYCLE_STATUS.ARCHIVED_BY_SELLER,
        updatedAt: new Date(),
      })
      .where(and(eq(adsTable.id, adId), eq(adsTable.userId, sellerUserId)));
    return { outcome: "archived", status: AD_LIFECYCLE_STATUS.ARCHIVED_BY_SELLER };
  }

  await db.delete(adsTable).where(and(eq(adsTable.id, adId), eq(adsTable.userId, sellerUserId)));
  return { outcome: "hard_deleted" };
}

/** Public ad detail + SEO: archived listings behave as deleted (404). */
export function shouldExposeAdDetailToViewer(
  status: string,
  viewerUserId: number | null,
  ownerUserId: number | null,
): boolean {
  if (isPublicListingStatus(status)) return true;
  if (isArchivedListingStatus(status)) return false;
  const isOwner = viewerUserId !== null && ownerUserId !== null && viewerUserId === ownerUserId;
  if (isOwner && (status === AD_LIFECYCLE_STATUS.PENDING || status === AD_LIFECYCLE_STATUS.REJECTED)) {
    return true;
  }
  if (isOwner && status === AD_LIFECYCLE_STATUS.HIDDEN) return true;
  return false;
}
