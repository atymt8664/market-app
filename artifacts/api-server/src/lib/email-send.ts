import { Resend } from "resend";
import { logger } from "./logger";
import { getOtpEmailTemplate, resolveOtpEmailLanguageForSend } from "./email-templates";

const defaultFromAddress = "Souq Arab EU <no-reply@souq-arab.com>";
const resendFromAddress = "Souq Arab EU <onboarding@resend.dev>";
const fromAddress = process.env["EMAIL_FROM"] || defaultFromAddress;

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}
const hasResendApiKey = Boolean(
  process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0,
);

function resolveSendFromAddress(): string {
  return (fromAddress || resendFromAddress).trim();
}

function ensureEmailProviderConfigured() {
  if (!hasResendApiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Configure Resend API key to send transactional emails.",
    );
  }
}

/** Worker / sync path — sends OTP verification email via Resend. */
export async function executeSendVerificationCodeEmail(
  email: string,
  code: string,
) {
  ensureEmailProviderConfigured();

  const resolvedFrom = resolveSendFromAddress();
  const otpLang = resolveOtpEmailLanguageForSend();
  const { subject, html } = getOtpEmailTemplate(otpLang, code);
  logger.info({
    kind: "resend_otp_attempt",
    recipient: email,
    resolvedFrom,
    hasResendApiKey,
    otpLanguage: otpLang,
  });

  const result = await getResendClient().emails.send({
    from: resolvedFrom,
    to: email,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || "فشل إرسال بريد التفعيل عبر Resend");
  }
}

/** Worker / sync path — sends password reset email via Resend. */
export async function executeSendPasswordResetEmail(
  email: string,
  resetUrl: string,
) {
  ensureEmailProviderConfigured();

  const result = await getResendClient().emails.send({
    from: resolveSendFromAddress(),
    to: email,
    subject: "إعادة تعيين كلمة المرور",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#111;">
        <h2 style="margin-bottom:8px;">طلب إعادة تعيين كلمة المرور</h2>
        <p style="margin-top:0;">اضغط الزر التالي لتعيين كلمة مرور جديدة:</p>
        <p style="margin:20px 0;">
          <a href="${resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block;">
            إعادة تعيين كلمة المرور
          </a>
        </p>
        <p>أو انسخ الرابط التالي في المتصفح:</p>
        <p dir="ltr" style="word-break:break-all;color:#4b5563;">${resetUrl}</p>
        <p style="color:#666;">ينتهي هذا الرابط خلال 60 دقيقة.</p>
      </div>
    `,
  });

  if (result.error) {
    logger.warn(
      {
        kind: "resend_password_reset_error",
        name: result.error.name,
        message: result.error.message,
      },
      "Resend password reset email rejected",
    );
    throw new Error(
      result.error.message || "فشل إرسال بريد إعادة تعيين كلمة المرور عبر Resend",
    );
  }
}
