/** Max wait between password step and TOTP step during admin login. */
export const ADMIN_TOTP_LOGIN_PENDING_MS = 5 * 60 * 1000;

/** Max time to complete QR scan + first code during in-dashboard 2FA setup. */
export const ADMIN_2FA_SETUP_PENDING_MS = 10 * 60 * 1000;

export const ADMIN_BACKUP_CODE_COUNT = 10;
