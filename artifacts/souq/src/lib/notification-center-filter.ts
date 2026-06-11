/** Chat types belong in Messages — never in Notification Center UI. */
export function isExcludedFromNotificationCenter(type: string): boolean {
  const n = type.trim().toLowerCase();
  return n.startsWith("message.") || n.startsWith("chat.");
}

export function filterNotificationCenterItems<T extends { type: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isExcludedFromNotificationCenter(row.type));
}
