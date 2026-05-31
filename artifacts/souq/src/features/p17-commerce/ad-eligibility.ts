type AdForOrderCheck = {
  userId?: number | null;
  status?: string | null;
  price?: string | number | null;
};

/** Mirrors server isAdEligibleForOrder (P17-4) for checkout preload UX. */
export function isAdEligibleForBuyerOrder(
  ad: AdForOrderCheck | undefined,
  buyerUserId: number | undefined,
): {
  eligible: boolean;
  reason?: "not_found" | "not_approved" | "no_price" | "own_ad";
} {
  if (!ad) return { eligible: false, reason: "not_found" };
  if (buyerUserId != null && ad.userId === buyerUserId) {
    return { eligible: false, reason: "own_ad" };
  }
  if (ad.status !== "approved") return { eligible: false, reason: "not_approved" };
  const price = ad.price != null ? Number.parseFloat(String(ad.price)) : Number.NaN;
  if (!Number.isFinite(price) || price <= 0) return { eligible: false, reason: "no_price" };
  return { eligible: true };
}
