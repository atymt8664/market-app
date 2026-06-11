/** Types excluded from user Notification Center (chat belongs in Messages only). */
export function isExcludedFromNotificationCenter(type: string): boolean {
  const n = type.trim().toLowerCase();
  return n.startsWith("message.") || n.startsWith("chat.");
}

export function filterNotificationCenterRows<T extends { type: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isExcludedFromNotificationCenter(row.type));
}
