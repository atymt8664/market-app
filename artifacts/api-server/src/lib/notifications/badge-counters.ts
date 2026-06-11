export const BADGE_COUNT_DISPLAY_CAP = 99;

export function clampBadgeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(BADGE_COUNT_DISPLAY_CAP, Math.floor(value)));
}

/** App Badge = Messages + Notifications (Architecture Lock). */
export function computeAppBadgeTotal(messages: number, notifications: number): number {
  const m = Number.isFinite(messages) ? Math.max(0, Math.floor(messages)) : 0;
  const n = Number.isFinite(notifications) ? Math.max(0, Math.floor(notifications)) : 0;
  return m + n;
}

export function formatBadgeCount(value: number): string {
  const n = Math.max(0, Math.floor(value));
  return n > BADGE_COUNT_DISPLAY_CAP ? `${BADGE_COUNT_DISPLAY_CAP}+` : String(n);
}
