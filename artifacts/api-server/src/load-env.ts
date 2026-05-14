import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * Must run before any module that reads `process.env` (e.g. `@workspace/db`).
 * Bundled entry otherwise evaluates `dotenv.config()` too late.
 * In development, `.env` overrides a stale `PORT` from the shell (e.g. Vite).
 */
const preservedPort = process.env.PORT;

dotenv.config({ override: process.env["NODE_ENV"] === "development" });

/** Optional local overrides (gitignored); keeps shared `.env` untouched on disk. */
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
}

/** If the process was started with `PORT=…` in the environment, keep it (e.g. second API instance for E2E). */
if (preservedPort) {
  process.env.PORT = preservedPort;
}
