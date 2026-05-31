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

const SURFACE_IDS = [
  "admin.billing",
  "admin.plans",
  "user.promote",
  "user.pro_seller",
];

console.log(`=== P8-1G Production verify (${WWW_BASE}) ===`);

const html = await body(`${WWW_BASE}/admin-login`);
const indexJs = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!indexJs) {
  bad("could not locate index JS chunk");
} else {
  const indexContent = await body(`${WWW_BASE}${indexJs[1]}`);
  const chunks = [...new Set([...indexContent.matchAll(/[a-z0-9_-]+-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]))];

  let boundaryChunk = null;
  for (const chunk of chunks) {
    const js = await body(`${WWW_BASE}/assets/${chunk}`);
    if (js.includes("data-p10-preview") && js.includes("data-p8-verification-ops")) {
      boundaryChunk = chunk;
      break;
    }
  }
  if (boundaryChunk) {
    ok(`monetization-boundary chunk present (/assets/${boundaryChunk})`);
  } else {
    bad("monetization-boundary chunk missing data-p10-preview helper");
  }

  for (const surface of SURFACE_IDS) {
    let found = false;
    for (const chunk of chunks) {
      const js = await body(`${WWW_BASE}/assets/${chunk}`);
      if (js.includes(`"${surface}"`)) {
        found = true;
        break;
      }
    }
    if (found) ok(`surface id "${surface}" in production bundle`);
    else bad(`surface id "${surface}" not found in bundle`);
  }

  for (const prefix of ["admin-billing", "admin-plans", "promote-ad", "professional-seller"]) {
    const chunk = chunks.find((c) => c.startsWith(`${prefix}-`));
    if (chunk) ok(`${prefix} chunk present (${chunk})`);
    else bad(`${prefix} chunk not found`);
  }
}

if (errors.length) {
  console.error(`\n=== P8-1G PRODUCTION VERIFY: FAIL (${errors.length}) ===`);
  process.exit(1);
}

console.log("\n=== P8-1G PRODUCTION VERIFY: PASS ===");
