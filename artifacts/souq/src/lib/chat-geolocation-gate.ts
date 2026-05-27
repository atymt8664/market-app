/** Maximum accuracy (metres) to treat a fix as the user's current location. */
export const CHAT_LOCATION_ACCURACY_TARGET_M = 15;

/** Accuracy bands for map zoom. */
export const CHAT_LOCATION_ACCURACY_IMPROVING_M = 100;
export const CHAT_LOCATION_ACCURACY_NEAR_M = 30;

export function canSendChatCurrentLocation(accuracyMeters: number | null | undefined): boolean {
  return (
    accuracyMeters != null &&
    Number.isFinite(accuracyMeters) &&
    accuracyMeters <= CHAT_LOCATION_ACCURACY_TARGET_M
  );
}

/** Progressive street-level zoom: medium → closer → precise. */
export function chatLocationAccuracyToZoom(accuracyMeters: number | null | undefined): number {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return 13;
  const acc = Math.max(5, accuracyMeters);
  if (acc <= CHAT_LOCATION_ACCURACY_TARGET_M) return 18;
  if (acc <= CHAT_LOCATION_ACCURACY_NEAR_M) return 16;
  if (acc <= CHAT_LOCATION_ACCURACY_IMPROVING_M) return 15;
  return 13;
}
