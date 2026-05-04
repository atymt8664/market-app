import type { Request } from "express";
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
  return normalizeAppUrl(process.env["FRONTEND_URL"]);
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

/**
 * Optional locale for OTP templates only. Does not change API behaviour when unset (defaults to Arabic).
 * Supported in env: ar | en | de (also accepts prefixes like en-US, de-DE).
 */
function resolveOtpEmailLanguage(): string {
  const raw =
    process.env["OTP_EMAIL_LANGUAGE"]?.trim() ||
    process.env["USER_LANGUAGE"]?.trim() ||
    process.env["USER_LOCALE"]?.trim() ||
    "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("ar")) return "ar";
  return "ar";
}

export function getOtpEmailTemplate(language: string, code: string): {
  subject: string;
  html: string;
} {
  const lang = language.toLowerCase().startsWith("de")
    ? "de"
    : language.toLowerCase().startsWith("en")
      ? "en"
      : "ar";

  if (lang === "de") {
    return {
      subject: "Konto bestätigen – Souq Arab EU",
      html: `
      <div dir="ltr" style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#111827;max-width:620px;margin:0 auto;">
        <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Willkommen bei Souq Arab EU</h2>
        <p style="margin:0 0 12px 0;">Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse mit dem folgenden Bestätigungscode, um Ihr Konto zu aktivieren.</p>
        <p style="margin:0 0 10px 0;font-weight:700;">Ihr Bestätigungscode:</p>
        <div style="margin:14px 0 18px 0;padding:16px 18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;display:inline-block;">
          <span style="font-size:34px;font-weight:800;letter-spacing:6px;color:#111827;">${code}</span>
        </div>
        <p style="margin:0 0 14px 0;color:#374151;">Geben Sie diesen Code in der App ein, um die Verifizierung abzuschließen.</p>
        <p style="margin:0 0 14px 0;color:#374151;"><strong>Sicherheitshinweis:</strong> Teilen Sie diesen Code nicht mit anderen.</p>
        <p style="margin:0;color:#6b7280;font-size:13px;">Der Code ist <strong>30 Minuten</strong> gültig.</p>
      </div>`,
    };
  }

  if (lang === "en") {
    return {
      subject: "Verify your account – Souq Arab EU",
      html: `
      <div dir="ltr" style="font-family:Arial,Helvetica,sans-serif;line-height:1.65;color:#111827;max-width:620px;margin:0 auto;">
        <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Welcome to Souq Arab EU</h2>
        <p style="margin:0 0 12px 0;">Thank you for signing up. Please verify your email address using the verification code below to activate your account.</p>
        <p style="margin:0 0 10px 0;font-weight:700;">Your verification code:</p>
        <div style="margin:14px 0 18px 0;padding:16px 18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;display:inline-block;">
          <span style="font-size:34px;font-weight:800;letter-spacing:6px;color:#111827;">${code}</span>
        </div>
        <p style="margin:0 0 14px 0;color:#374151;">Enter this code in the app to complete verification.</p>
        <p style="margin:0 0 14px 0;color:#374151;"><strong>Security note:</strong> Do not share this code with anyone.</p>
        <p style="margin:0;color:#6b7280;font-size:13px;">This code expires in <strong>30 minutes</strong>.</p>
      </div>`,
    };
  }

  return {
    subject: "تأكيد حسابك في سوق العرب EU",
    html: `
      <div dir="rtl" style="font-family:Arial,'Segoe UI',Tahoma,sans-serif;line-height:1.85;color:#111827;max-width:620px;margin:0 auto;">
        <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">مرحبًا بك في سوق العرب EU</h2>
        <p style="margin:0 0 12px 0;">شكرًا لتسجيلك معنا. لتفعيل حسابك والمتابعة بأمان، يرجى استخدام رمز التحقق أدناه لتأكيد بريدك الإلكتروني.</p>
        <p style="margin:0 0 10px 0;font-weight:700;">رمز التحقق:</p>
        <div style="margin:14px 0 18px 0;padding:16px 18px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;display:inline-block;">
          <span style="font-size:34px;font-weight:800;letter-spacing:6px;color:#111827;">${code}</span>
        </div>
        <p style="margin:0 0 14px 0;color:#374151;">يرجى إدخال هذا الرمز في التطبيق لإتمام عملية التفعيل.</p>
        <p style="margin:0 0 14px 0;color:#374151;"><strong>تنبيه أمني:</strong> لا تشارك هذا الرمز مع أي شخص للحفاظ على أمان حسابك.</p>
        <p style="margin:0;color:#6b7280;font-size:13px;">صلاحية الرمز: <strong>30 دقيقة</strong> من وقت الإرسال.</p>
      </div>`,
  };
}

type RequestLike = Pick<Request, "get">;

/** Prefer tunnel/public origin from proxy headers so reset links work on trycloudflare, not only localhost. */
function publicFrontendBase(req?: RequestLike): string {
  if (req) {
    const xfProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const xfHost =
      req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
    if (xfHost) {
      const proto =
        xfProto ||
        (xfHost.includes("trycloudflare.com") ? "https" : "http");
      return normalizeAppUrl(`${proto}://${xfHost}`);
    }
  }
  return getFrontendUrl();
}

export function buildResetPasswordUrl(token: string, req?: RequestLike) {
  void req;
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return resetUrl;
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  ensureEmailProviderConfigured();

  const resolvedFrom = resolveSendFromAddress();
  const otpLang = resolveOtpEmailLanguage();
  const { subject, html } = getOtpEmailTemplate(otpLang, code);
  logger.info({
    kind: "resend_otp_attempt",
    recipient: email,
    resolvedFrom,
    hasResendApiKey,
    otpLanguage: otpLang,
  });

  const result = await resend.emails.send({
    from: resolvedFrom,
    to: email,
    subject,
    html,
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
