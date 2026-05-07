import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import {
  db,
  usersTable,
  userFollowsTable,
  userViewsTable,
  adsTable,
} from "@workspace/db";

import { and, eq, sql } from "drizzle-orm";

import {
  AuthLoginBody,
  AuthVerifyEmailBody,
  AuthResendVerificationBody,
} from "@workspace/api-zod";
import {
  buildResetPasswordUrl,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
} from "../lib/email";
import { logger } from "../lib/logger";
import { ensureAppSettingsTable } from "../lib/ensure-app-settings-table";
import {
  attachAdminCsrfToken,
  hasValidAdminSession,
} from "../middlewares/require-admin";
import {
  getSessionClearCookieOptions,
  SESSION_COOKIE_NAME,
} from "../lib/session-cookie";
import {
  ACCOUNT_DISABLED_CODE,
  ACCOUNT_DISABLED_MESSAGE,
  destroySessionRespondBanned,
} from "../middlewares/require-auth";

const router: IRouter = Router();

function normalizeAuthLoginBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const o = body as Record<string, unknown>;
  return {
    ...o,
    email: typeof o.email === "string" ? o.email.trim() : o.email,
    password: typeof o.password === "string" ? o.password.trim() : o.password,
  };
}

/** Many clients only display `error`; include provider text so failures are not opaque. */
function jsonMailProvider502(
  details: string,
  arabicSummary: string,
): { error: string; details: string; code: "EMAIL_PROVIDER_ERROR" } {
  return {
    error: `${arabicSummary} — ${details}`,
    details,
    code: "EMAIL_PROVIDER_ERROR",
  };
}

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تم تجاوز الحد المسموح، حاول لاحقاً" },
});

const isDevApi = process.env.NODE_ENV !== "production";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  /** Behind Vite + cloudflared every client often shares one IP — keep prod strict, dev forgiving. */
  max: isDevApi ? 300 : 10,
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

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevApi ? 200 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، حاول لاحقاً" },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "بيانات الدخول غير صحيحة" },
});

const ADMIN_LOGIN_MAX_FAILURES = 5;
const ADMIN_LOGIN_LOCK_MS = 15 * 60 * 1000;
const adminLoginFailures = new Map<string, { count: number; lockUntil: number }>();

function getAdminLoginIdentifier(req: import("express").Request) {
  const raw = req.ip || req.socket.remoteAddress || "";
  const ip = String(raw).split(",")[0]?.trim() || "unknown";
  return `admin-login:${ip}`;
}

function isAdminLoginLocked(identifier: string): boolean {
  const state = adminLoginFailures.get(identifier);
  if (!state) return false;
  if (state.lockUntil > Date.now()) return true;
  adminLoginFailures.delete(identifier);
  return false;
}

function registerAdminLoginFailure(identifier: string) {
  const current = adminLoginFailures.get(identifier) ?? { count: 0, lockUntil: 0 };
  const nextCount = current.count + 1;
  const lockUntil = nextCount >= ADMIN_LOGIN_MAX_FAILURES ? Date.now() + ADMIN_LOGIN_LOCK_MS : 0;
  adminLoginFailures.set(identifier, {
    count: lockUntil ? 0 : nextCount,
    lockUntil,
  });
}

function clearAdminLoginFailures(identifier: string) {
  adminLoginFailures.delete(identifier);
}

async function statsForUser(userId: number) {
  const [followerRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userFollowsTable)
    .where(eq(userFollowsTable.followingId, userId));
  const [followingRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userFollowsTable)
    .where(eq(userFollowsTable.followerId, userId));
  const [viewsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userViewsTable)
    .where(eq(userViewsTable.profileId, userId));
  const [adsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(adsTable)
    .where(eq(adsTable.userId, userId));
  return {
    followerCount: Number(followerRow?.c ?? 0),
    followingCount: Number(followingRow?.c ?? 0),
    profileViews: Number(viewsRow?.c ?? 0),
    adCount: Number(adsRow?.c ?? 0),
  };
}

function serializeUserBasic(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    city: u.city,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt.toISOString(),
    emailVerified: u.emailVerified,
  };
}

async function serializeUserMe(u: typeof usersTable.$inferSelect) {
  const stats = await statsForUser(u.id);
  return { ...serializeUserBasic(u), ...stats };
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function expiryDate() {
  return new Date(Date.now() + 30 * 60 * 1000); // 30 min
}

/** Password reset link: valid for 1 hour until consumed (token cleared on success). */
function resetExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

async function deliverVerificationCode(email: string, code: string) {
  await sendVerificationCodeEmail(email, code);
}

async function deliverPasswordResetLink(email: string, url: string) {
  await sendPasswordResetEmail(email, url);
}

const SignupRequestBody = z
  .object({
    firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
    lastName: z.string().trim().min(1, "اسم العائلة مطلوب"),
    email: z.string().trim().email("البريد الإلكتروني غير صحيح"),
    country: z.string().trim().min(2, "الرجاء اختيار الدولة"),
    countryCode: z.string().trim().min(2, "الرجاء اختيار الدولة"),
    phoneCountryCode: z.string().trim().regex(/^\+[0-9]{1,4}$/, "رقم الهاتف غير صحيح لهذه الدولة"),
    phoneNumber: z.string().trim().regex(/^[0-9]{6,15}$/, "رقم الهاتف غير صحيح لهذه الدولة"),
    city: z.string().trim().min(1, "الرجاء اختيار المدينة من القائمة"),
    password: z.string().min(1, "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
    acceptTerms: z.literal(true, { message: "يجب الموافقة على الشروط والأحكام" }),
    acceptPrivacy: z.literal(true, { message: "يجب الموافقة على سياسة الخصوصية" }),
  })
  .superRefine((v, ctx) => {
    if (!/[a-z]/.test(v.password) || !/[A-Z]/.test(v.password) || !/[0-9]/.test(v.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف",
      });
    }
    if (v.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف",
      });
    }
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "كلمة المرور وتأكيد كلمة المرور غير متطابقين",
      });
    }
  });

router.post("/auth/signup", signupLimiter, async (req, res) => {
  try {
    const parsed = SignupRequestBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "بيانات غير صحيحة",
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phoneCountryCode,
      phoneNumber,
      city,
    } = parsed.data;
    const name = `${firstName} ${lastName}`.trim();
    const phone = `${phoneCountryCode}${phoneNumber}`;
    const normalizedEmail = email.toLowerCase();

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing[0]) {
      const user = existing[0];

      if (!user.emailVerified) {
        const code = generateCode();

        await db
          .update(usersTable)
          .set({
            passwordHash: await bcrypt.hash(password, 10),
            name,
            phone,
            city,
            verificationCode: code,
            verificationExpiresAt: expiryDate(),
          })
          .where(eq(usersTable.id, user.id));

        try {
          await deliverVerificationCode(user.email, code);
        } catch (mailError) {
          console.error("Verification email send failed:", mailError);
          const details =
            mailError instanceof Error ? mailError.message : "Email provider error";
          res.status(502).json(
            jsonMailProvider502(
              details,
              "تعذر إرسال رمز التفعيل إلى البريد الإلكتروني",
            ),
          );
          return;
        }

        res.json({
          ok: true,
          email: user.email,
          needsVerification: true,
          message: "تم إرسال رمز تفعيل جديد",
        });
        return;
      }

      res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();

    const [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        passwordHash,
        name,
        phone,
        city,
        emailVerified: false,
        verificationCode: code,
        verificationExpiresAt: expiryDate(),
      })
      .returning();

    try {
      await deliverVerificationCode(normalizedEmail, code);
    } catch (mailError) {
      console.error("Verification email send failed:", mailError);
      const details =
        mailError instanceof Error ? mailError.message : "Email provider error";
      res.status(502).json(
        jsonMailProvider502(
          details,
          "تعذر إرسال رمز التفعيل إلى البريد الإلكتروني",
        ),
      );
      return;
    }

    res.json({
      ok: true,
      email: normalizedEmail,
      needsVerification: true,
      message: "تم إنشاء الحساب، تحقق من بريدك",
      user: serializeUserBasic(user!),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "تعذر إنشاء الحساب" });
  }
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const parsed = AuthLoginBody.safeParse(normalizeAuthLoginBody(req.body));

  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
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

  if (user.isBanned) {
    res.status(403).json({
      error: ACCOUNT_DISABLED_MESSAGE,
      code: ACCOUNT_DISABLED_CODE,
    });
    return;
  }

  req.session.userId = user.id;
  res.json(await serializeUserMe(user));
});

router.patch("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }

  const [existingMe] = await db
    .select({ isBanned: usersTable.isBanned })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!existingMe) {
    req.session.destroy(() => {
      res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
      res.status(401).json({ error: "غير مسجل الدخول" });
    });
    return;
  }
  if (existingMe.isBanned) {
    destroySessionRespondBanned(req, res);
    return;
  }

  const body = req.body as {
    name?: unknown;
    phone?: unknown;
    city?: unknown;
    avatarUrl?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const city = typeof body.city === "string" ? body.city.trim() : undefined;
  const avatarUrl =
    body.avatarUrl === null
      ? null
      : typeof body.avatarUrl === "string"
        ? body.avatarUrl.trim()
        : undefined;

  if (name !== undefined && name.length < 2) {
    res.status(400).json({ error: "الاسم قصير جداً" });
    return;
  }
  if (phone !== undefined && phone.length < 5) {
    res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    return;
  }
  if (
    typeof avatarUrl === "string" &&
    !(
      avatarUrl.startsWith("/api/storage/objects/") ||
      avatarUrl.startsWith("/objects/")
    )
  ) {
    res.status(400).json({ error: "مسار الصورة غير صالح" });
    return;
  }
  const patch: Record<string, string | null> = {};
  if (name !== undefined) patch["name"] = name;
  if (phone !== undefined) patch["phone"] = phone;
  if (city !== undefined) patch["city"] = city;
  if (avatarUrl !== undefined) patch["avatarUrl"] = avatarUrl;
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "لا تغييرات" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set(patch)
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(await serializeUserMe(updated!));
});

router.post("/auth/change-password", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  const body = req.body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const current =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (next.length < 6) {
    res.status(400).json({ error: "كلمة المرور الجديدة قصيرة جداً" });
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  if (user.isBanned) {
    destroySessionRespondBanned(req, res);
    return;
  }
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) {
    res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    return;
  }
  const passwordHash = await bcrypt.hash(next, 10);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
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
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  if (user.isBanned) {
    destroySessionRespondBanned(req, res);
    return;
  }
  res.json(await serializeUserMe(user));
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
    res.json({ ok: true, alreadyVerified: true });
    return;
  }
  if (
    !user.verificationCode ||
    !user.verificationExpiresAt ||
    String(user.verificationCode).trim() !== String(code).trim() ||
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
  res.json({
    ok: true,
    email: updated!.email,
    verified: true,
  });
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
  try {
    await deliverVerificationCode(user.email, code);
  } catch (mailError) {
    console.error("Verification email resend failed:", mailError);
    const details =
      mailError instanceof Error ? mailError.message : "Email provider error";
    res.status(502).json(
      jsonMailProvider502(
        details,
        "تعذر إرسال رمز التفعيل إلى البريد الإلكتروني",
      ),
    );
    return;
  }
  res.json({
    ok: true,
  });
});

router.post("/auth/forgot-password", passwordResetLimiter, async (req, res) => {
  const body = req.body as { email?: unknown };
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "بريد إلكتروني غير صحيح" });
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  const user = rows[0];
  // Always respond OK to avoid leaking which emails are registered.
  if (!user) {
    res.json({ ok: true });
    return;
  }
  const token = generateToken();
  const hashedToken = hashToken(token);
  await db
    .update(usersTable)
    .set({
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: resetExpiry(),
    })
    .where(eq(usersTable.id, user.id));
  // Email contains the raw token; DB stores SHA-256 only.
  const url = buildResetPasswordUrl(token, req);
  try {
    await deliverPasswordResetLink(user.email, url);
  } catch (mailError) {
    const details =
      mailError instanceof Error ? mailError.message : "Email provider error";
    logger.warn(
      {
        route: "POST /auth/forgot-password",
        httpStatus: 502,
        mailErrorPreview: details.slice(0, 200),
      },
      "password reset email delivery failed",
    );
    res.status(502).json(
      jsonMailProvider502(details, "تعذر إرسال بريد إعادة التعيين"),
    );
    return;
  }
  res.json({ ok: true });
});

router.post("/auth/reset-password", passwordResetLimiter, async (req, res) => {
  const body = req.body as { token?: unknown; password?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const invalidPassword =
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password);
  if (!token || invalidPassword) {
    res.status(400).json({
      error:
        "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف",
    });
    return;
  }
  const INVALID_RESET = "رابط إعادة التعيين غير صالح أو منتهي";
  const hashedToken = hashToken(token);
  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await db
    .update(usersTable)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      // If the user is resetting their password they have proven email control,
      // so verify the email if it wasn't already.
      emailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
    })
    .where(
      and(
        eq(usersTable.passwordResetToken, hashedToken),
        sql`${usersTable.passwordResetExpiresAt} > NOW()`,
      ),
    )
    .returning({ id: usersTable.id });
  if (updated.length === 0) {
    res.status(400).json({ error: INVALID_RESET });
    return;
  }
  res.json({ ok: true });
});

// Suppress unused import warning when only referenced via select chains.
void and;

router.post("/admin-login", adminLoginLimiter, async (req, res) => {
  const { password } = req.body;
  const loginIdentifier = getAdminLoginIdentifier(req);

  if (isAdminLoginLocked(loginIdentifier)) {
    return res.status(429).json({ error: "بيانات الدخول غير صحيحة" });
  }

  if (!password || typeof password !== "string") {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  await ensureAppSettingsTable();
  const settingsResult = await db.execute(
    sql`select admin_password_hash as admin_password_hash from app_settings where id = 1 limit 1`,
  );
  const settingsRows = Array.isArray(settingsResult)
    ? (settingsResult as Array<{ admin_password_hash?: unknown }>)
    : (
        settingsResult as unknown as { rows?: Array<{ admin_password_hash?: unknown }> }
      ).rows;
  const settingsRow = settingsRows?.[0];
  const adminPasswordHash =
    settingsRow && typeof settingsRow.admin_password_hash === "string"
      ? settingsRow.admin_password_hash
      : "";
  if (!adminPasswordHash) {
    return res.status(500).json({ error: "Admin password is not configured" });
  }

  const isValid = await bcrypt.compare(password, adminPasswordHash);
  if (!isValid) {
    registerAdminLoginFailure(loginIdentifier);
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  clearAdminLoginFailures(loginIdentifier);
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      req.session.isAdmin = true;
      req.session.adminAuthenticatedAt = Date.now();
      req.session.adminActorId = 1;
      req.session.adminActorLabel = "primary-admin";
      req.session.adminCsrfToken = undefined;
      resolve();
    });
  });
  const csrfToken = attachAdminCsrfToken(req, res);
  return res.json({
    success: true,
    csrfToken,
    adminActorLabel: req.session.adminActorLabel ?? "primary-admin",
  });
});

router.get("/admin/me", (req, res) => {
  if (hasValidAdminSession(req)) {
    const csrfToken = attachAdminCsrfToken(req, res);
    return res.json({
      isAdmin: true,
      csrfToken,
      adminActorLabel: req.session.adminActorLabel ?? "primary-admin",
    });
  }

  return res.status(401).json({ isAdmin: false });
});

router.post("/admin-logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
    return res.json({ success: true });
  });
});

export default router;
