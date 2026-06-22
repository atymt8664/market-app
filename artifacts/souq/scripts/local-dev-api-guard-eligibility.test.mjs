/**
 * Unit checks for local dev API guard eligibility (no browser).
 */
import assert from "node:assert/strict";

const PRODUCTION_APP_HOSTS = new Set(["www.souq-arab.com", "souq-arab.com"]);

function isLocalDevHostname(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function isEligible({ hostname, apiBaseUrl, isDev, isProd }) {
  if (apiBaseUrl) return false;
  const host = hostname.toLowerCase();
  if (PRODUCTION_APP_HOSTS.has(host)) return false;
  if (host.endsWith(".vercel.app")) return false;
  if (isDev) return isLocalDevHostname(host);
  if (isProd && isLocalDevHostname(host)) return true;
  return false;
}

assert.equal(isEligible({ hostname: "www.souq-arab.com", apiBaseUrl: "", isDev: false, isProd: true }), false);
assert.equal(isEligible({ hostname: "127.0.0.1", apiBaseUrl: "", isDev: true, isProd: false }), true);
assert.equal(isEligible({ hostname: "127.0.0.1", apiBaseUrl: "http://localhost:3001", isDev: true, isProd: false }), false);
assert.equal(isEligible({ hostname: "preview.vercel.app", apiBaseUrl: "", isDev: false, isProd: true }), false);

console.log(JSON.stringify({ ok: true, cases: 4 }, null, 2));
