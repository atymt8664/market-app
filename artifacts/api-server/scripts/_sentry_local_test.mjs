/**
 * Local Sentry verification only. Requires SENTRY_DSN in .env.local
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
process.env.NODE_ENV = process.env.NODE_ENV || "development";

await import("../src/load-env.ts");

if (!process.env.SENTRY_DSN?.trim()) {
  console.error("SKIP: set SENTRY_DSN first (pnpm run sentry:apply-dsn -- \"<DSN>\")");
  process.exit(2);
}

if (process.env.NODE_ENV === "production") {
  console.error("BLOCKED: production NODE_ENV");
  process.exit(1);
}

const { initSentry, captureSentryTestError, flushSentry, isSentryEnabled } =
  await import("../src/lib/sentry.ts");

initSentry();
await new Promise((r) => setTimeout(r, 3000));

if (!isSentryEnabled()) {
  console.error("FAIL: Sentry did not initialize");
  process.exit(1);
}

const requestId = "7a5b-local-" + crypto.randomUUID();
const eventId = await captureSentryTestError(requestId);
const flushed = await flushSentry(5000);

console.log(
  JSON.stringify(
    {
      ok: Boolean(eventId) && flushed,
      eventId,
      requestId,
      hint: "Search requestId in Sentry Issues",
    },
    null,
    2,
  ),
);

if (!eventId || !flushed) process.exit(1);
