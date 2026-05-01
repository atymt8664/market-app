import { Resend } from "resend";
import { logger } from "./logger";

const defaultAppUrl = "http://localhost:5173";
const defaultFromAddress = "Souq Arab EU <souqarab.market@gmail.com>";
const resendFromAddress = "Souq Arab EU <onboarding@resend.dev>";

function normalizeAppUrl(rawUrl: string | undefined) {
  const trimmed = (rawUrl || defaultAppUrl).trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function getFrontendUrl() {
  const frontend = process.env["FRONTEND_URL"];
  const app = process.env["APP_URL"];
  return normalizeAppUrl(frontend || app);
}
const fromAddress = process.env["EMAIL_FROM"] || defaultFromAddress;
const resend = new Resend(process.env.RESEND_API_KEY);
const hasResendApiKey = Boolean(
  process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0,
);

/** Same `from` resolution as password reset: EMAIL_FROM when set, else legacy default, else Resend sandbox. */
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

export function buildResetPasswordUrl(token: string) {
  const frontendUrl = getFrontendUrl();
  return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  ensureEmailProviderConfigured();

  const resolvedFrom = resolveSendFromAddress();
  logger.info({
    kind: "resend_otp_attempt",
    recipient: email,
    resolvedFrom,
    hasResendApiKey,
  });

  const result = await resend.emails.send({
    from: resolvedFrom,
    to: email,
    subject: "رمز التفعيل",
    html: `<p>رمز التفعيل الخاص بك هو: <b>${code}</b></p>`,
  });

  if (result.error) {
    throw new Error(result.error.message || "فشل إرسال بريد التفعيل عبر Resend");
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  ensureEmailProviderConfigured();

  const result = await resend.emails.send({
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
    throw new Error(
      result.error.message || "فشل إرسال بريد إعادة تعيين كلمة المرور عبر Resend",
    );
  }
}
