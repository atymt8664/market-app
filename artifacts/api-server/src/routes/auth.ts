import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  AuthSignupBody,
  AuthLoginBody,
  AuthVerifyEmailBody,
  AuthResendVerificationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const isProd = process.env.NODE_ENV === "production";

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تم تجاوز الحد المسموح، حاول لاحقاً" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، انتظر قليلاً وحاول مجدداً" },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، انتظر قليلاً وحاول مجدداً" },
});

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    city: u.city,
    emailVerified: u.emailVerified,
  };
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiryDate() {
  return new Date(Date.now() + 30 * 60 * 1000); // 30 min
}

// Replace this stub with real email delivery (e.g. SendGrid) once configured.
async function deliverVerificationCode(email: string, code: string) {
  // eslint-disable-next-line no-console
  console.log(`[email-verification] code for ${email}: ${code}`);
}

router.post("/auth/signup", signupLimiter, async (req, res) => {
  const parsed = AuthSignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { email, password, name, phone, city } = parsed.data;
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateCode();
  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone,
      city: city ?? "",
      emailVerified: false,
      verificationCode: code,
      verificationExpiresAt: expiryDate(),
    })
    .returning();
  await deliverVerificationCode(user!.email, code);
  // Don't sign user in until verified.
  res.json({
    ...serializeUser(user!),
    // Only included outside production so users can complete the flow without
    // a configured email provider. Remove once SMTP is connected.
    ...(isProd ? {} : { devVerificationCode: code }),
  });
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const parsed = AuthLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { email, password } = parsed.data;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
    return;
  }
  if (!user.emailVerified) {
    res.status(403).json({
      error: "لم يتم تفعيل البريد الإلكتروني بعد",
      code: "EMAIL_NOT_VERIFIED",
      email: user.email,
    });
    return;
  }
  req.session.userId = user.id;
  res.json(serializeUser(user));
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("souq.sid");
    res.status(204).end();
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!rows[0]) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  res.json(serializeUser(rows[0]));
});

router.post("/auth/verify-email", verifyLimiter, async (req, res) => {
  const parsed = AuthVerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { email, code } = parsed.data;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];
  if (!user) {
    res.status(404).json({ error: "الحساب غير موجود" });
    return;
  }
  if (user.emailVerified) {
    req.session.userId = user.id;
    res.json(serializeUser(user));
    return;
  }
  if (
    !user.verificationCode ||
    !user.verificationExpiresAt ||
    user.verificationCode !== code ||
    user.verificationExpiresAt.getTime() < Date.now()
  ) {
    res.status(400).json({ error: "رمز التفعيل غير صحيح أو منتهي الصلاحية" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({
      emailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
    })
    .where(eq(usersTable.id, user.id))
    .returning();
  req.session.userId = updated!.id;
  res.json(serializeUser(updated!));
});

router.post("/auth/resend-verification", verifyLimiter, async (req, res) => {
  const parsed = AuthResendVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { email } = parsed.data;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];
  // Always return success to avoid leaking which emails are registered.
  if (!user || user.emailVerified) {
    res.json({ ok: true });
    return;
  }
  const code = generateCode();
  await db
    .update(usersTable)
    .set({ verificationCode: code, verificationExpiresAt: expiryDate() })
    .where(eq(usersTable.id, user.id));
  await deliverVerificationCode(user.email, code);
  res.json({
    ok: true,
    ...(isProd ? {} : { devVerificationCode: code }),
  });
});

export default router;
