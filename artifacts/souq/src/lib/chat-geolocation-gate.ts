/** Accuracy bands for progressive map zoom. */
export const CHAT_LOCATION_ACCURACY_PRECISE_M = 15;
export const CHAT_LOCATION_ACCURACY_IMPROVING_M = 100;
export const CHAT_LOCATION_ACCURACY_NEAR_M = 30;

/** Progressive street-level zoom: medium → closer → precise. */
export function chatLocationAccuracyToZoom(accuracyMeters: number | null | undefined): number {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return 13;
  const acc = Math.max(5, accuracyMeters);
  if (acc <= CHAT_LOCATION_ACCURACY_PRECISE_M) return 18;
  if (acc <= CHAT_LOCATION_ACCURACY_NEAR_M) return 16;
  if (acc <= CHAT_LOCATION_ACCURACY_IMPROVING_M) return 15;
  return 13;
}
