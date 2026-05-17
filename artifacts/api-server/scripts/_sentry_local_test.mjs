/**
 * Phase 7A.5b — Local Sentry verification only (never run against production).
 * Requires SENTRY_DSN in artifacts/api-server/.env.local
 * Does not print secrets or full DSN.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");

process.chdir(apiRoot);
process.env.NODE_ENV = process.env.NODE_ENV || "development";

await import("../src/instrument-sentry.ts");

const dsnConfigured = Boolean(process.env.SENTRY_DSN?.trim());
if (!dsnConfigured) {
  console.error("SKIP: SENTRY_DSN is not set in .env.local");
  process.exit(2);
}

if (process.env.NODE_ENV === "production") {
  console.error("BLOCKED: do not run Sentry test script in production NODE_ENV");
  process.exit(1);
}

const { captureSentryTestError, flushSentry, getSentryStatus, isSentryEnabled } =
  await import("../src/lib/sentry.ts");

if (!isSentryEnabled()) {
  console.error("FAIL: Sentry did not initialize despite SENTRY_DSN being set");
  process.exit(1);
}

const testRequestId = "7a5b-local-test-" + crypto.randomUUID();
const eventId = await captureSentryTestError(testRequestId);
const flushed = await flushSentry(5000);
const status = getSentryStatus();

console.log(
  JSON.stringify(
    {
      ok: Boolean(eventId) && flushed,
      eventId: eventId ?? null,
      flushed,
      requestId: testRequestId,
      sentry: {
        enabled: status.enabled,
        configured: status.configured,
        environment: status.environment,
        release: status.release,
      },
      hint: "Open Sentry Issues and search tag requestId or eventId (DSN not printed).",
    },
    null,
    2,
  ),
);

if (!eventId || !flushed) process.exit(1);
