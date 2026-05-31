const STORAGE_PREFIX = "p17-checkout-idem-";

/** HTTP / older mobile WebViews may lack crypto.randomUUID — must not crash checkout. */
function newIdempotencyToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p17-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export function getCheckoutIdempotencyKey(adId: number): string {
  const key = `${STORAGE_PREFIX}${adId}`;
  if (typeof sessionStorage === "undefined") {
    return newIdempotencyToken();
  }
  const existing = sessionStorage.getItem(key);
  if (existing && existing.length >= 8) return existing;
  const created = newIdempotencyToken();
  sessionStorage.setItem(key, created);
  return created;
}

export function clearCheckoutIdempotencyKey(adId: number): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`${STORAGE_PREFIX}${adId}`);
}
