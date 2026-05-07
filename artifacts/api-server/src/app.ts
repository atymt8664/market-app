import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { createCorsOriginHandler } from "./lib/cors-allowlist";
import { getSessionCookieSecure, getSessionSameSite, SESSION_COOKIE_NAME } from "./lib/session-cookie";
import { getSessionSecret } from "./lib/session-secret";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
    adminAuthenticatedAt?: number;
    adminCsrfToken?: string;
    adminActorId?: number;
    adminActorLabel?: string;
  }
}

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

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

app.use(
  cors({
    origin: createCorsOriginHandler(isProduction),
    credentials: true,
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
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

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled API error");
  const statusCode =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : typeof err?.status === "number"
        ? err.status
        : 500;
  if (res.headersSent) return;
  const exposeMessage =
    statusCode < 500 &&
    typeof err?.message === "string" &&
    err.message.length > 0 &&
    err.message.length < 500;
  res.status(statusCode).json({
    error: isProduction
      ? statusCode >= 500
        ? "Internal Server Error"
        : exposeMessage
          ? err.message
          : "Request failed"
      : err?.message || "Request failed",
  });
});

export default app;
