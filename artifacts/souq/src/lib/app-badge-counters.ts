/** P17-9-5 — client counter contract (mirrors api-server notifications/counters). */

export type UnreadCounters = {
  messages: number;
  notifications: number;
  total: number;
};

export const BADGE_COUNT_DISPLAY_CAP = 99;

export function clampBadgeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(BADGE_COUNT_DISPLAY_CAP, Math.floor(value)));
}

export function computeAppBadgeTotal(messages: number, notifications: number): number {
  const m = Number.isFinite(messages) ? Math.max(0, Math.floor(messages)) : 0;
  const n = Number.isFinite(notifications) ? Math.max(0, Math.floor(notifications)) : 0;
  return m + n;
}

export function formatBadgeCount(value: number): string {
  const n = Math.max(0, Math.floor(value));
  return n > BADGE_COUNT_DISPLAY_CAP ? `${BADGE_COUNT_DISPLAY_CAP}+` : String(n);
}

export function normalizeUnreadCounters(raw: unknown): UnreadCounters | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const messages = Number(o.messages);
  const notifications = Number(o.notifications);
  if (!Number.isFinite(messages) || !Number.isFinite(notifications)) return null;
  const total = Number.isFinite(Number(o.total))
    ? Number(o.total)
    : computeAppBadgeTotal(messages, notifications);
  return {
    messages: Math.max(0, Math.floor(messages)),
    notifications: Math.max(0, Math.floor(notifications)),
    total: Math.max(0, Math.floor(total)),
  };
}

/** Badging API — clamps for OS badge (PWA). */
export function resolveNavigatorBadgeCount(total: number): number {
  const t = Math.max(0, Math.floor(total));
  return t > 0 ? clampBadgeCount(t) : 0;
}
