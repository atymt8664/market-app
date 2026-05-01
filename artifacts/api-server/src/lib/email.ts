import nodemailer from "nodemailer";

const defaultAppUrl = "http://localhost:5173";
const defaultFromAddress = "Souq Arab EU <souqarab.market@gmail.com>";

function normalizeAppUrl(rawUrl: string | undefined) {
  const trimmed = (rawUrl || defaultAppUrl).trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function getFrontendUrl() {
  const frontend = process.env["FRONTEND_URL"];
  const app = process.env["APP_URL"];
  return normalizeAppUrl(frontend || app);
}
const smtpUser = process.env["EMAIL_USER"] || "souqarab.market@gmail.com";
const smtpPass = process.env["EMAIL_PASS"];
const fromAddress = process.env["EMAIL_FROM"] || defaultFromAddress;
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});
const hasSmtpCredentials = Boolean(
  smtpUser &&
    smtpUser.trim().length > 0 &&
    smtpPass &&
    smtpPass.trim().length > 0,
);

function ensureEmailProviderConfigured() {
  if (!hasSmtpCredentials) {
    throw new Error(
      "Missing EMAIL_USER/EMAIL_PASS. Configure Gmail SMTP credentials to send transactional emails.",
    );
  }
}

export function buildResetPasswordUrl(token: string) {
  const frontendUrl = getFrontendUrl();
  return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  ensureEmailProviderConfigured();

  const result = await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: "رمز تفعيل حسابك في سوق العرب EU",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9;color:#111827;max-width:620px;margin:0 auto;">
        <h2 style="margin:0 0 10px 0;font-size:20px;">مرحباً،</h2>
        <p style="margin:0 0 10px 0;">شكراً لتسجيلك في سوق العرب EU.</p>
        <p style="margin:0 0 8px 0;">رمز تفعيل حسابك هو:</p>
        <div style="margin:12px 0 16px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;display:inline-block;">
          <span style="font-size:34px;font-weight:800;letter-spacing:6px;color:#111827;">${code}</span>
        </div>
        <p style="margin:0 0 10px 0;">يرجى إدخال هذا الرمز في التطبيق لإكمال عملية التفعيل.</p>
        <p style="margin:0 0 8px 0;font-weight:700;">تنبيه:</p>
        <p style="margin:0 0 12px 0;color:#374151;">لا تشارك هذا الرمز مع أي شخص حفاظاً على أمان حسابك.</p>
        <p style="margin:0 0 12px 0;color:#374151;">إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.</p>
        <p style="margin:0;">مع تحيات،<br/>فريق سوق العرب EU</p>
      </div>
    `,
  });

  if (result.rejected.length > 0) {
    throw new Error("فشل إرسال بريد التفعيل عبر Gmail SMTP");
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  ensureEmailProviderConfigured();

  const result = await transporter.sendMail({
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

  if (result.rejected.length > 0) {
    throw new Error("فشل إرسال بريد إعادة تعيين كلمة المرور عبر Gmail SMTP");
  }
}
