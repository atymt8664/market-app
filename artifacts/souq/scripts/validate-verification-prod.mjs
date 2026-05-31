#!/usr/bin/env node
/**
 * Production verification — status filters + API guards (no secrets).
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
      headers: { "User-Agent": "souq-verification-prod-verify", ...(init?.headers || {}) },
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function body(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "souq-verification-prod-verify" } });
    return await res.text();
  } catch {
    return "";
  }
}

console.log(`=== Verification Production verify (${API_BASE}) ===`);

const c = await status(`${API_BASE}/api/healthz`);
c === 200 ? ok(`api/healthz (${c})`) : bad(`api/healthz (${c})`);

for (const qs of ["", "?status=all&queue=all", "?status=pending", "?page=1&pageSize=50"]) {
  const code = await status(`${API_BASE}/api/admin/verification/requests${qs}`);
  code === 401 || code === 403 ? ok(`requests${qs || "(base)"} guard (${code})`) : bad(`requests${qs} unexpected (${code})`);
}

const html = await body(`${WWW_BASE}/admin-login`);
const indexJs = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!indexJs) {
  bad("could not locate index JS");
} else {
  const indexContent = await body(`${WWW_BASE}${indexJs[1]}`);
  const chunk = [...indexContent.matchAll(/admin-verification-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0])[0];
  if (!chunk) {
    bad("admin-verification chunk not in index");
  } else {
    const js = await body(`${WWW_BASE}/assets/${chunk}`);
    const markers = ["filter_pending", "label_status", 'status!=="all"', "VERIFICATION_STATUS_FILTER"];
    const missing = markers.filter((m) => !js.includes(m));
    if (missing.length) {
      bad(`bundle missing: ${missing.join(", ")} (${chunk})`);
    } else {
      ok(`status filter UI in bundle (/assets/${chunk})`);
    }
  }
}

if (errors.length) {
  console.error(`\n=== VERIFICATION PRODUCTION VERIFY: FAIL (${errors.length}) ===`);
  process.exit(1);
}

console.log("\n=== VERIFICATION PRODUCTION VERIFY: PASS ===");
