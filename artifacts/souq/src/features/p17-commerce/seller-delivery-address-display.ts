/** P17-7A §8 — display helpers for seller delivery address rows (unit-testable). */

export const ORDER_ADDRESS_DISPLAY_FALLBACK = "—";

export function displayOrderAddressValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : ORDER_ADDRESS_DISPLAY_FALLBACK;
}
