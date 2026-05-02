import "dotenv/config";
import dns from "node:dns";
import { createServer } from "http";

/** Prefer IPv4 for outbound HTTPS (Railway/Node + Supabase sometimes fail with undici "fetch failed" on IPv6). */
dns.setDefaultResultOrder("ipv4first");
import app from "./app";
import { logger } from "./lib/logger";
import { attachWebSocketServer } from "./lib/realtime";
import { prepareDatabase } from "./lib/prepare-database";

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

async function start() {
  try {
    await prepareDatabase();
  } catch (err) {
    logger.error({ err }, "Database preparation failed");
    process.exit(1);
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
