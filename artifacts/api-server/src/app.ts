import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { ensureCoreSchema } from "./lib/ensure-core-schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
    adminAuthenticatedAt?: number;
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
      secure: isProduction,
      sameSite: "lax",
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

void ensureCoreSchema(pool)
  .then(() =>
    pool.query(
      `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'general',
      subject TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal',
      related_ad_id INTEGER NULL REFERENCES ads(id) ON DELETE SET NULL,
      related_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ NULL
    );
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS related_ad_id INTEGER NULL REFERENCES ads(id) ON DELETE SET NULL;
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS related_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;
    UPDATE support_tickets SET category = 'general' WHERE category IS NULL OR btrim(category) = '';
    UPDATE support_tickets SET subject = 'بدون عنوان' WHERE subject IS NULL OR btrim(subject) = '';
    UPDATE support_tickets SET message = 'بدون رسالة' WHERE message IS NULL OR btrim(message) = '';
    ALTER TABLE support_tickets ALTER COLUMN category SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN subject SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN message SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN status SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN priority SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_tickets_status_check'
      ) THEN
        ALTER TABLE support_tickets
          ADD CONSTRAINT support_tickets_status_check
          CHECK (status IN ('open', 'pending', 'resolved', 'closed'));
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_tickets_priority_check'
      ) THEN
        ALTER TABLE support_tickets
          ADD CONSTRAINT support_tickets_priority_check
          CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);

    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      admin_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON support_ticket_messages(ticket_id);

    WITH dedup AS (
      SELECT id
      FROM (
        SELECT
          id,
          row_number() OVER (
            PARTITION BY ad_id, buyer_id
            ORDER BY last_message_at DESC NULLS LAST, id DESC
          ) AS rn
        FROM conversations
      ) ranked
      WHERE rn > 1
    )
    DELETE FROM conversations c
    USING dedup
    WHERE c.id = dedup.id;

    CREATE UNIQUE INDEX IF NOT EXISTS conversations_ad_id_buyer_id_unique
      ON conversations(ad_id, buyer_id);
    `,
    ),
  )
  .catch((err) => {
    logger.error({ err }, "Failed to ensure DB schema (core + support/conversations)");
  });

export default app;
