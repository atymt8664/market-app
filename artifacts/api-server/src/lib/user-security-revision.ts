/** Session ↔ DB `users.security_revision` alignment for invalidating sessions after 2FA changes. */

export const DEFAULT_USER_SECURITY_REVISION = 0;

export function normalizeDbUserSecurityRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return DEFAULT_USER_SECURITY_REVISION;
  }
  return value;
}

export function normalizeSessionUserSecurityRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return DEFAULT_USER_SECURITY_REVISION;
  }
  return value;
}

export function isUserSecurityRevisionStale(
  sessionRevision: unknown,
  currentDbRevision: unknown,
): boolean {
  const dbRev = normalizeDbUserSecurityRevision(currentDbRevision);
  const sessRev = normalizeSessionUserSecurityRevision(sessionRevision);
  return sessRev !== dbRev;
}
