/** Pending user login TOTP step lifetime (ms). */
export const USER_TOTP_LOGIN_PENDING_MS = 5 * 60 * 1000;

/** In-dashboard 2FA enrollment pending secret lifetime (ms). */
export const USER_2FA_SETUP_PENDING_MS = 10 * 60 * 1000;

/** One-time backup codes issued on enable / regenerate. */
export const USER_BACKUP_CODE_COUNT = 10;

/** Failed TOTP attempts during pending login before clearing pending state. */
export const USER_TOTP_LOGIN_MAX_FAILURES = 5;
