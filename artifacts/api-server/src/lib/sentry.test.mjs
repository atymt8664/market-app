import assert from "node:assert/strict";
import { getSentryDsn } from "./sentry-env.ts";

const prev = process.env.SENTRY_DSN;
delete process.env.SENTRY_DSN;
assert.equal(getSentryDsn(), undefined);
assert.equal(getSentryDsn(), undefined);
process.env.SENTRY_DSN = "not-a-valid-dsn";
assert.equal(getSentryDsn(), undefined);
process.env.SENTRY_DSN = prev;
console.log("sentry.test.mjs: ok");
