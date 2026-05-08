/**
 * Session ↔ DB `admin_security_revision` alignment for invalidating admin sessions
 * after security-sensitive changes (e.g. 2FA on/off, secret rotation).
 *
 * Not enforced in middleware until the 2FA login flow sets `session.adminSecurityRevision`.
 */

/** Initial revision for existing deployments before any security bump. */
export const DEFAULT_ADMIN_SECURITY_REVISION = 0;

export function normalizeDbAdminSecurityRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return DEFAULT_ADMIN_SECURITY_REVISION;
  }
  return value;
}

/** Maps unset session revision to 0 so legacy sessions match DB revision 0. */
export function normalizeSessionAdminSecurityRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return DEFAULT_ADMIN_SECURITY_REVISION;
  }
  return value;
}

/**
 * True when the session should be treated as invalid for admin API access
 * because the server bumped `admin_security_revision` since this session was issued.
 */
export function isAdminSecurityRevisionStale(
  sessionRevision: unknown,
  currentDbRevision: unknown,
): boolean {
  const dbRev = normalizeDbAdminSecurityRevision(currentDbRevision);
  const sessRev = normalizeSessionAdminSecurityRevision(sessionRevision);
  return sessRev !== dbRev;
}
