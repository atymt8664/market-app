import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { observabilityMiddleware } from "./middlewares/observability";
import { captureApiError, initSentry, sentryRequestMiddleware } from "./lib/sentry";
import { createRequestId } from "./lib/observability/request-id";
import {
  productionSafeErrorMessage,
  sendClientError,
} from "./lib/observability/client-error";
import { createCorsOriginHandler } from "./lib/cors-allowlist";
import { getSessionCookieSecure, getSessionSameSite, SESSION_COOKIE_NAME } from "./lib/session-cookie";
import { getSessionSecret } from "./lib/session-secret";
import { apiSecurityHeadersMiddleware } from "./lib/security-headers";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
    adminAuthenticatedAt?: number;
    adminCsrfToken?: string;
    adminActorId?: number;
    adminActorLabel?: string;
    /** Set after successful ADMIN_ACCESS_KEY verification at admin login (same TTL as admin session). */
    adminAccessGrantedAt?: number;
    /** Password verified; awaiting TOTP before full admin session (future 2FA step). */
    adminTotpPending?: boolean;
    /** Epoch ms; pending step expires (future 2FA). */
    adminTotpPendingExpiresAt?: number;
    /** Mirrors app_settings.admin_security_revision after login; used to invalidate sessions when revision bumps. */
    adminSecurityRevision?: number;
    /** Pending TOTP secret during in-dashboard 2FA enrollment (server session only). */
    admin2faSetupSecret?: string;
    admin2faSetupExpiresAt?: number;
    /** Failed admin-login TOTP attempts during pending step (cleared on success or lockout). */
    adminTotpFailedAttempts?: number;
    /** Staff credential accounts must change temporary password before admin access. */
    adminMustChangePassword?: boolean;
    /** CSRF token for logged-in user mutations (separate from `adminCsrfToken`). */
    userCsrfToken?: string;
  }
}

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

initSentry();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(observabilityMiddleware);
app.use(sentryRequestMiddleware);

app.use(
  pinoHttp({
    logger,
    genReqId(req) {
      return typeof req.id === "string" && req.id.length > 0 ? req.id : createRequestId();
    },
    customProps(req) {
      return { requestId: req.id };
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url?.split("?")[0]} ${res.statusCode}`;
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(apiSecurityHeadersMiddleware(isProduction));

app.use(
  cors({
    origin: createCorsOriginHandler(isProduction),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Access-Key",
      "X-CSRF-Token",
      "X-Requested-With",
      "X-Request-Id",
    ],
    exposedHeaders: ["X-CSRF-Token", "X-Request-Id"],
    maxAge: 86_400,
  }),
);
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgStore = connectPgSimple(session);

app.use(
  session({
    name: SESSION_COOKIE_NAME,
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: getSessionCookieSecure(),
      sameSite: getSessionSameSite(),
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);

app.use("/api", router);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = typeof req.id === "string" ? req.id : undefined;
  logger.error({ err, requestId }, "Unhandled API error");
  const e = err as { statusCode?: number; status?: number; message?: string };
  const statusCode =
    typeof e?.statusCode === "number"
      ? e.statusCode
      : typeof e?.status === "number"
        ? e.status
        : 500;
  if (statusCode >= 500) {
    captureApiError(err, req);
  }
  if (res.headersSent) return;
  if (isProduction) {
    if (statusCode >= 500) {
      sendClientError(res, req, statusCode, "Internal Server Error");
      return;
    }
    sendClientError(res, req, statusCode, productionSafeErrorMessage(err));
    return;
  }
  sendClientError(res, req, statusCode, e?.message || "Request failed");
});

export default app;
