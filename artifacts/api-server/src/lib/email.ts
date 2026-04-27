import { Resend } from "resend";

const defaultAppUrl = "http://localhost:5173";
const defaultFromAddress = "Souq <onboarding@resend.dev>";

function normalizeAppUrl(rawUrl: string | undefined) {
  const trimmed = (rawUrl || defaultAppUrl).trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

const appUrl = normalizeAppUrl(process.env["APP_URL"]);
const resendApiKey = process.env["RESEND_API_KEY"];
const fromAddress = process.env["EMAIL_FROM"] || defaultFromAddress;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const hasResendKey = Boolean(resendApiKey && resendApiKey.trim().length > 0);

function logEmailDebug(event: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[email:${event}]`, payload);
}

function ensureEmailProviderConfigured() {
  if (!resend) {
    throw new Error(
      "Missing RESEND_API_KEY. Configure it to send transactional emails.",
    );
  }
}

export function buildResetPasswordUrl(token: string) {
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  ensureEmailProviderConfigured();

  logEmailDebug("send_verification_start", {
    to: email,
    from: fromAddress,
    keyLoaded: hasResendKey,
  });

  const result = await resend!.emails.send({
    from: fromAddress,
    to: email,
    subject: "رمز تفعيل الحساب",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#111;">
        <h2 style="margin-bottom:8px;">رمز تفعيل حسابك</h2>
        <p style="margin-top:0;">استخدم الرمز التالي لإكمال التفعيل:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;">${code}</p>
        <p style="color:#666;">صلاحية الرمز 30 دقيقة. لا تشاركه مع أي شخص.</p>
      </div>
    `,
  });

  logEmailDebug("send_verification_result", result as Record<string, unknown>);
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  ensureEmailProviderConfigured();

  logEmailDebug("send_reset_start", {
    to: email,
    from: fromAddress,
    keyLoaded: hasResendKey,
  });

  const result = await resend!.emails.send({
    from: fromAddress,
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

  logEmailDebug("send_reset_result", result as Record<string, unknown>);
}
