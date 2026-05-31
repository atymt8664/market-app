/** Backward-compatible barrel — templates, URLs, and legacy sync send helpers. */
export {
  buildResetPasswordUrl,
  getOtpEmailTemplate,
  resolveOtpEmailLanguageForSend,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
} from "./email-templates";

export {
  dispatchPasswordResetEmail,
  dispatchVerificationCodeEmail,
  isEmailOutboxEnabled,
} from "./email-outbox";
