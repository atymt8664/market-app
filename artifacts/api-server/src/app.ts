import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
    adminAuthenticatedAt?: number;
  }
}

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";
/** trycloudflare / HTTPS dev: SESSION_COOKIE_SECURE=1 → Secure + SameSite=None (required with Secure cross-context cookies). */
const sessionCookieSecure =
  isProduction || process.env["SESSION_COOKIE_SECURE"] === "1";
const sessionSameSite: "lax" | "none" =
  sessionCookieSecure ? "none" : "lax";

app.use(
  pinoHttp({
    logger,
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

app.use(cors({ origin: true, credentials: true }));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgStore = connectPgSimple(session);

app.set("trust proxy", 1);

app.use(
  session({
    name: "souq.sid",
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env["SESSION_SECRET"] || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);

app.use("/api", router);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled API error");
  const statusCode =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : typeof err?.status === "number"
        ? err.status
        : 500;
  if (res.headersSent) return;
  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : err?.message || "Request failed",
  });
});

export default app;
