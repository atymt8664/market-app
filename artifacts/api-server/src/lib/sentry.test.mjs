import assert from "node:assert/strict";
import {
  getSentryDsn,
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "./sentry-env.ts";

const prevDsn = process.env.SENTRY_DSN;
const prevEnv = process.env.SENTRY_ENVIRONMENT;
delete process.env.SENTRY_DSN;
delete process.env.SENTRY_ENVIRONMENT;

assert.equal(getSentryDsn(), undefined);
assert.equal(resolveSentryEnvironment(), "development");
assert.equal(resolveSentryRelease(), undefined);

process.env.SENTRY_DSN = "https://example.invalid/1";
process.env.SENTRY_ENVIRONMENT = "staging-test";
assert.equal(getSentryDsn(), "https://example.invalid/1");
assert.equal(resolveSentryEnvironment(), "staging-test");

process.env.SENTRY_DSN = prevDsn;
if (prevEnv !== undefined) process.env.SENTRY_ENVIRONMENT = prevEnv;
else delete process.env.SENTRY_ENVIRONMENT;

console.log("sentry.test.mjs: ok");
