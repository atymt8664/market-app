import "./load-env";
import dns from "node:dns";
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachWebSocketServer } from "./lib/realtime";
import { prepareDatabase } from "./lib/prepare-database";
import { runSupabaseStorageStartupProbe } from "./lib/supabaseStorage";
import { assertSafeRuntimeEnv } from "./lib/env-safety";

/** Prefer IPv4 for outbound HTTPS (Railway/Node + Supabase sometimes fail with undici "fetch failed" on IPv6). */
dns.setDefaultResultOrder("ipv4first");

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
attachWebSocketServer(server);

function logDatabaseTargetSanitized(): void {
  const raw = process.env["DATABASE_URL"]?.trim();
  if (!raw) {
    logger.warn("DATABASE_URL is not set");
    return;
  }
  try {
    const u = new URL(raw);
    logger.info(
      {
        dbHost: u.hostname,
        dbPort: u.port || "(default)",
        dbName: u.pathname.replace(/^\//, "").split(/[?]/)[0] || "(unknown)",
      },
      "API PostgreSQL target (sanitized, no password)",
    );
  } catch {
    logger.warn("DATABASE_URL is set but could not be parsed for logging");
  }
}

async function start() {
  assertSafeRuntimeEnv();
  logDatabaseTargetSanitized();
  try {
    await prepareDatabase();
  } catch (err) {
    logger.error({ err }, "Database preparation failed");
    process.exit(1);
  }

  try {
    await runSupabaseStorageStartupProbe();
  } catch (probeErr) {
    logger.warn(
      { errMessage: probeErr instanceof Error ? probeErr.message : String(probeErr) },
      "Supabase Storage startup probe threw (non-fatal)",
    );
  }

  server.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

void start();
