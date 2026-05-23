import assert from "node:assert/strict";
import { resolvePgPoolConfig } from "./pool-config.ts";

assert.equal(resolvePgPoolConfig("development").max, 10);
assert.equal(resolvePgPoolConfig("production").max, 30);

process.env.PG_POOL_MAX = "45";
assert.equal(resolvePgPoolConfig("production").max, 45);

process.env.PG_POOL_MAX = "999";
assert.equal(resolvePgPoolConfig("production").max, 30);

process.env.PG_POOL_MAX = "0";
assert.equal(resolvePgPoolConfig("production").max, 30);

delete process.env.PG_POOL_MAX;

const cfg = resolvePgPoolConfig("production");
assert.equal(cfg.idleTimeoutMillis, 30_000);
assert.equal(cfg.connectionTimeoutMillis, 10_000);

console.log("pool-config.test.mjs: PASS");
