import dotenv from "dotenv";

/**
 * Must run before any module that reads `process.env` (e.g. `@workspace/db`).
 * Bundled entry otherwise evaluates `dotenv.config()` too late.
 * In development, `.env` overrides a stale `PORT` from the shell (e.g. Vite).
 */
dotenv.config({ override: process.env["NODE_ENV"] === "development" });
