import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const src = readFileSync(join(root, "api-url.ts"), "utf8");
assert.ok(src.includes("PRODUCTION_API_BASE"), "missing production API fallback");
assert.ok(src.includes("www.souq-arab.com"), "missing www host guard");

const ws = readFileSync(join(root, "build-ws-url.ts"), "utf8");
assert.ok(ws.includes("getApiBaseUrl"), "build-ws-url must use getApiBaseUrl");

console.log("api-url.test.mjs: OK");
