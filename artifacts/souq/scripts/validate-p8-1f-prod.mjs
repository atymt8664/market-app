#!/usr/bin/env node
/**
 * P8-1F — Production verification (no secrets).
 * Checks API health, admin guards, and deployed frontend bundle markers.
 */
const API_BASE = process.env.API_BASE || "https://api.souq-arab.com";
const WWW_BASE = process.env.WWW_BASE || "https://www.souq-arab.com";
const errors = [];

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  console.error(`  FAIL ${msg}`);
  errors.push(msg);
}

async function status(url, init) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": "souq-p8-1f-prod-verify", ...(init?.headers || {}) },
    });
    return res.status;
  } catch (e) {
    return 0;
  }
}

async function body(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "souq-p8-1f-prod-verify" } });
    return await res.text();
  } catch {
    return "";
  }
}

console.log(`=== P8-1F Production verify (${API_BASE}) ===`);

let c = await status(`${API_BASE}/healthz`);
(c === 200 || c === 200) && c === 200 ? ok(`healthz (${c})`) : bad(`healthz (${c})`);

c = await status(`${API_BASE}/api/healthz`);
c === 200 ? ok(`api/healthz (${c})`) : bad(`api/healthz (${c})`);

c = await status(`${API_BASE}/api/readyz`);
c === 200 || c === 503 ? ok(`api/readyz (${c})`) : bad(`api/readyz (${c})`);

c = await status(`${API_BASE}/api/admin/me`);
c === 401 || c === 403 ? ok(`admin/me guard (${c})`) : bad(`admin/me guard (${c})`);

c = await status(`${API_BASE}/api/admin/dashboard`);
c === 401 || c === 403 ? ok(`admin/dashboard guard (${c})`) : bad(`admin/dashboard guard (${c})`);

c = await status(`${API_BASE}/api/admin/analytics`);
c === 401 || c === 403 ? ok(`admin/analytics guard (${c})`) : bad(`admin/analytics guard (${c})`);

c = await status(`${API_BASE}/api/admin/monitoring`);
c === 401 || c === 403 ? ok(`admin/monitoring guard (${c})`) : bad(`admin/monitoring guard (${c})`);

c = await status(`${API_BASE}/api/admin/operations/founder`);
c === 401 || c === 403 ? ok(`admin/operations/founder guard (${c})`) : bad(`admin/operations/founder guard (${c})`);

c = await status(`${WWW_BASE}/admin-login`);
c === 200 ? ok(`admin-login page (${c})`) : bad(`admin-login page (${c})`);

const html = await body(`${WWW_BASE}/admin-login`);
if (html.includes("data-dashboard-contract") || html.includes("dashboard-contract")) {
  ok("admin bundle marker in HTML (inline)");
} else {
  const scriptMatch = html.match(/src="(\/assets\/admin[^"]+\.js)"/);
  if (scriptMatch) {
    const js = await body(`${WWW_BASE}${scriptMatch[1]}`);
    if (js.includes("data-dashboard-contract") || js.includes("noc.executive.today.new_users")) {
      ok(`admin bundle marker in ${scriptMatch[1]}`);
    } else {
      bad(`admin bundle missing P8-1F markers in ${scriptMatch[1]} — deploy may be pending`);
    }
  } else {
    const indexJs = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (indexJs) {
      const js = await body(`${WWW_BASE}${indexJs[1]}`);
      if (js.includes("dashboardContractAttrs") || js.includes("data-dashboard-contract")) {
        ok(`index bundle contains dashboard contracts (${indexJs[1]})`);
      } else {
        bad("frontend bundle missing dashboardContractAttrs — Vercel deploy pending?");
      }
    } else {
      bad("could not locate admin JS chunk for P8-1F marker check");
    }
  }
}

if (errors.length) {
  console.error(`\n=== P8-1F PRODUCTION VERIFY: FAIL (${errors.length}) ===`);
  process.exit(1);
}

console.log("\n=== P8-1F PRODUCTION VERIFY: PASS ===");
