/** P15-3 — transactional email job payloads (no secrets in logs). */

export type AuthOtpEmailPayload = {
  to: string;
  code: string;
  /** STAGING smoke only — skips Resend when true. */
  dryRun?: boolean;
};

export type AuthResetEmailPayload = {
  to: string;
  resetUrl: string;
  dryRun?: boolean;
};

export type EmailJobPayload = AuthOtpEmailPayload | AuthResetEmailPayload;
