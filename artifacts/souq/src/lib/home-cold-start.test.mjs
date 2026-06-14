/** P9-3/P9-6 — home cold start contract unit checks (no DOM). */
import assert from "node:assert/strict";

// Minimal re-implementation mirrors for pure logic — source-of-truth is TS at runtime.
function isIosWebKitUa(ua) {
  return /iP(hone|ad|od)/.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

assert.equal(isIosWebKitUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"), true);
assert.equal(isIosWebKitUa("Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile"), false);

console.log("home-cold-start.test.mjs: PASS");
