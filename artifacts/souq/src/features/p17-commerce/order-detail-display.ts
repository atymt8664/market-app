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

const REAL_ORDER_ID_PATTERNS = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  /^\d{6,}$/,
  /^ORD[-_]?\d{4,}$/i,
  /^SOUQ[-_]?\d{4,}$/i,
];

/**
 * Returns true when the URL id must not be shown to users (preview/debug routes).
 */
export function shouldMaskOrderNumber(orderId: string): boolean {
  const trimmed = orderId.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (PREVIEW_ORDER_ID_EXACT.has(lower)) return true;

  const baseSegment = lower.split(/[-_/]/)[0];
  if (PREVIEW_ORDER_ID_EXACT.has(baseSegment)) return true;

  return !REAL_ORDER_ID_PATTERNS.some((pattern) => pattern.test(trimmed));
}
