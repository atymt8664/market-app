import type { Request } from "express";

const defaultAppUrl = "http://localhost:5173";

function normalizeAppUrl(rawUrl: string | undefined) {
  const trimmed = (rawUrl || defaultAppUrl).trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function getFrontendUrl() {
  const raw =
    process.env["FRONTEND_URL"]?.trim() ||
    process.env["APP_URL"]?.trim();
  return normalizeAppUrl(raw || undefined);
}

/** Optional locale for OTP templates only. Defaults to Arabic when unset. */
export function resolveOtpEmailLanguageForSend(): string {
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

function resolveResetPasswordBase(req?: RequestLike): string {
  const explicit =
    process.env["FRONTEND_URL"]?.trim() ||
    process.env["APP_URL"]?.trim();
  if (explicit) {
    return normalizeAppUrl(explicit);
  }
  return publicFrontendBase(req);
}

export function buildResetPasswordUrl(token: string, req?: RequestLike) {
  const base = resolveResetPasswordBase(req);
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  const { executeSendVerificationCodeEmail } = await import("./email-send");
  return executeSendVerificationCodeEmail(email, code);
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const { executeSendPasswordResetEmail } = await import("./email-send");
  return executeSendPasswordResetEmail(email, resetUrl);
}
