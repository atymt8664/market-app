/** P9-3A — home cold start: no pendingSwReload / no Home reload from SW. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const souqRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cold = fs.readFileSync(path.join(souqRoot, "src/lib/home-cold-start.ts"), "utf8");
const sw = fs.readFileSync(path.join(souqRoot, "src/lib/register-production-service-worker.ts"), "utf8");

function isIosWebKitUa(ua) {
  return /iP(hone|ad|od)/.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

assert.equal(isIosWebKitUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"), true);
assert.equal(isIosWebKitUa("Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile"), false);
assert.equal(cold.includes("pendingSwReload"), false);
assert.equal(cold.includes("location.reload"), false);
assert.match(sw, /isHomePathname\(\)\) return/);
assert.match(sw, /P9-3A/);

console.log("home-cold-start.test.mjs: PASS");
