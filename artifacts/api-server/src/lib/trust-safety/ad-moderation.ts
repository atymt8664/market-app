export type AdModerationSnapshot = {
  title: string;
  description: string;
  price: string | null;
  priceType: string;
  type: string;
  city: string;
  images: string[];
  categoryId: number;
  subcategoryId: number | null;
  sellerName: string;
  sellerPhone: string;
  details: Record<string, unknown>;
};

type AdRowLike = {
  title: string;
  description: string;
  price: string | null;
  priceType: string;
  type: string;
  city: string;
  images: unknown;
  categoryId: number;
  subcategoryId: number | null;
  sellerName: string;
  sellerPhone: string;
  details: unknown;
};

export function adSnapshotFromRow(row: AdRowLike): AdModerationSnapshot {
  return {
    title: row.title,
    description: row.description,
    price: row.price,
    priceType: row.priceType,
    type: row.type,
    city: row.city,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    sellerName: row.sellerName,
    sellerPhone: row.sellerPhone,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {},
  };
}

function stableJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function imagesChanged(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return true;
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) return true;
  }
  return false;
}

export function adContentChanged(
  before: AdModerationSnapshot,
  after: AdModerationSnapshot,
): boolean {
  if (before.title !== after.title) return true;
  if (before.description !== after.description) return true;
  if (before.price !== after.price) return true;
  if (before.priceType !== after.priceType) return true;
  if (before.type !== after.type) return true;
  if (before.city !== after.city) return true;
  if (before.categoryId !== after.categoryId) return true;
  if (before.subcategoryId !== after.subcategoryId) return true;
  if (before.sellerName !== after.sellerName) return true;
  if (before.sellerPhone !== after.sellerPhone) return true;
  if (imagesChanged(before.images, after.images)) return true;
  if (stableJson(before.details) !== stableJson(after.details)) return true;
  return false;
}

const RE_REVIEW_STATUSES = new Set(["approved", "hidden", "rejected"]);

/**
 * Non-admin edits that change moderated content return the ad to pending review.
 */
export function computeAdStatusAfterUserEdit(
  currentStatus: string,
  before: AdModerationSnapshot,
  after: AdModerationSnapshot,
): string {
  if (!RE_REVIEW_STATUSES.has(currentStatus)) {
    return currentStatus;
  }
  if (!adContentChanged(before, after)) {
    return currentStatus;
  }
  return "pending";
}

export function shouldClearFeaturedOnReReview(
  previousStatus: string,
  nextStatus: string,
  featured: boolean,
): boolean {
  return featured && previousStatus === "approved" && nextStatus === "pending";
}
