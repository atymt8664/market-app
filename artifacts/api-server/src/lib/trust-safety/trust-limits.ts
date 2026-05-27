import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const isProduction = process.env.NODE_ENV === "production";

function userKey(req: Request, prefix: string): string {
  const uid = req.session?.userId;
  if (typeof uid === "number" && uid > 0) return `${prefix}:u:${uid}`;
  return `${prefix}:ip:${ipKeyGenerator(req.ip ?? "")}`;
}

export const createAdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 12 : 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AD_RATE_LIMIT", message: "تجاوزت حد نشر الإعلانات، حاول لاحقاً" },
  keyGenerator: (req) => userKey(req, "ads:create"),
});

export const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 45 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "MESSAGE_RATE_LIMIT", message: "رسائل كثيرة، انتظر قليلاً ثم أعد المحاولة" },
  keyGenerator: (req) => userKey(req, "msg:send"),
});

export const createReportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: isProduction ? 25 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "REPORT_RATE_LIMIT", message: "تجاوزت حد البلاغات اليومي" },
  keyGenerator: (req) => userKey(req, "report:create"),
});

export const createSupportTicketLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: isProduction ? 8 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "SUPPORT_RATE_LIMIT", message: "تجاوزت حد طلبات الدعم اليومي" },
  keyGenerator: (req) => userKey(req, "support:create"),
});

/** New accounts (< 48h) may publish fewer ads per day. */
export const NEW_ACCOUNT_MAX_ADS_PER_DAY = isProduction ? 5 : 40;

export const NEW_ACCOUNT_AGE_MS = 48 * 60 * 60 * 1000;

export const DUPLICATE_AD_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DUPLICATE_REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DUPLICATE_MESSAGE_WINDOW_MS = 5 * 60 * 1000;

export const DUPLICATE_MESSAGE_MAX = 3;

export function normalizeDuplicateText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
