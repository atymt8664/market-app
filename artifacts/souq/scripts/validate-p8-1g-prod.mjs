#!/usr/bin/env node
/**
 * P8-1G — Production boundary markers (no secrets).
 */
const WWW_BASE = process.env.WWW_BASE || "https://www.souq-arab.com";
const errors = [];

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  console.error(`  FAIL ${msg}`);
  errors.push(msg);
}

async function body(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "souq-p8-1g-prod-verify" } });
    return await res.text();
  } catch {
    return "";
  }
}

console.log(`=== P8-1G Production verify (${WWW_BASE}) ===`);

const html = await body(`${WWW_BASE}/admin-login`);
const indexJs = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!indexJs) {
  bad("could not locate index JS chunk");
} else {
  const indexContent = await body(`${WWW_BASE}${indexJs[1]}`);
  const chunks = [...new Set([...indexContent.matchAll(/[a-z0-9_-]+-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]))];
  const targets = ["admin-billing", "admin-plans", "promote-ad", "professional-seller"];
  for (const prefix of targets) {
    const chunk = chunks.find((c) => c.startsWith(`${prefix}-`));
    if (!chunk) {
      bad(`${prefix} chunk not found in index bundle`);
      continue;
    }
    const js = await body(`${WWW_BASE}/assets/${chunk}`);
    if (js.includes("data-p10-preview")) {
      ok(`${prefix} chunk contains data-p10-preview marker`);
    } else {
      bad(`${prefix} chunk missing data-p10-preview (deploy may predate P8-1G)`);
    }
  }
}

const docCheck = await body(`${WWW_BASE}/`);
if (docCheck.includes("data-p10-preview")) {
  ok("www bundle references p10 preview markers");
}

if (errors.length) {
  console.error(`\n=== P8-1G PRODUCTION VERIFY: FAIL (${errors.length}) ===`);
  process.exit(1);
}

console.log("\n=== P8-1G PRODUCTION VERIFY: PASS ===");
