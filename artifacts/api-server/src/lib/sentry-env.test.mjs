import assert from "node:assert/strict";
import {
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "./sentry-env.ts";

const prev = {
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  RAILWAY_GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA,
  RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
  NODE_ENV: process.env.NODE_ENV,
};

delete process.env.SENTRY_RELEASE;
process.env.RAILWAY_GIT_COMMIT_SHA = "abc123def456789";
delete process.env.RAILWAY_ENVIRONMENT_NAME;
delete process.env.NODE_ENV;

assert.equal(resolveSentryRelease(), "souq-api@abc123def456");

process.env.RAILWAY_ENVIRONMENT_NAME = "production";
assert.equal(resolveSentryEnvironment(), "production");

process.env.SENTRY_RELEASE = prev.SENTRY_RELEASE;
process.env.RAILWAY_GIT_COMMIT_SHA = prev.RAILWAY_GIT_COMMIT_SHA;
process.env.RAILWAY_ENVIRONMENT_NAME = prev.RAILWAY_ENVIRONMENT_NAME;
process.env.NODE_ENV = prev.NODE_ENV;

console.log("sentry-env.test.mjs: ok");
