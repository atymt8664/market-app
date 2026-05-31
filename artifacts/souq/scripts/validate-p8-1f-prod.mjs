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
const indexJs = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (indexJs) {
  const indexContent = await body(`${WWW_BASE}${indexJs[1]}`);
  const adminChunk = indexContent.match(/admin-[A-Za-z0-9_-]+\.js/);
  if (adminChunk) {
    const adminJs = await body(`${WWW_BASE}/assets/${adminChunk[0]}`);
    const hasContractIds =
      adminJs.includes("noc.executive.today.new_users") &&
      adminJs.includes("noc.user.online_now");
    if (hasContractIds) {
      ok(`admin bundle P8-1F contract IDs in /assets/${adminChunk[0]}`);
    } else {
      bad(`admin bundle missing P8-1F contract IDs in /assets/${adminChunk[0]}`);
    }
  } else {
    bad("could not resolve admin lazy chunk from index bundle");
  }
} else {
  bad("could not locate index JS chunk");
}

for (const chunk of ["admin-stats", "admin-monitoring", "admin-operations"]) {
  const chunkMatch = indexJs?.[1]
    ? (await body(`${WWW_BASE}${indexJs[1]}`)).match(new RegExp(`${chunk}-[A-Za-z0-9_-]+\\.js`))
    : null;
  if (chunkMatch) {
    ok(`${chunk} chunk present (${chunkMatch[0]})`);
  } else {
    bad(`${chunk} chunk not found in index bundle`);
  }
}

if (errors.length) {
  console.error(`\n=== P8-1F PRODUCTION VERIFY: FAIL (${errors.length}) ===`);
  process.exit(1);
}

console.log("\n=== P8-1F PRODUCTION VERIFY: PASS ===");
