/** Canonical public order number — must match api-server `isOrderNumber`. */
export const CANONICAL_ORDER_NUMBER_PATTERN = /^SOUQ-\d{4}-\d{6}$/;

export function isCanonicalOrderNumber(orderId: string): boolean {
  return CANONICAL_ORDER_NUMBER_PATTERN.test(orderId.trim());
}

/** Preview / debug route segments — never show as order numbers in UI. */
const PREVIEW_ORDER_ID_EXACT = new Set([
  "test",
  "demo",
  "preview",
  "placeholder",
  "mock",
  "sample",
  "dev",
  "debug",
  "ready",
  "example",
  "staging",
  "temp",
  "fake",
]);

/**
 * Returns true when the URL id must not be shown to users (preview/debug routes).
 * Canonical SOUQ-YYYY-NNNNNN is never masked.
 */
export function shouldMaskOrderNumber(orderId: string): boolean {
  const trimmed = orderId.trim();
  if (!trimmed) return true;
  if (isCanonicalOrderNumber(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (PREVIEW_ORDER_ID_EXACT.has(lower)) return true;

  const baseSegment = lower.split(/[-_/]/)[0];
  if (PREVIEW_ORDER_ID_EXACT.has(baseSegment)) return true;

  return true;
}
