/** Only these ad statuses are visible on public listings, search, and to anonymous users. */
export const PUBLIC_AD_STATUSES = ["approved"] as const;

export function isPublicAdStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PUBLIC_AD_STATUSES as readonly string[]).includes(status);
}
