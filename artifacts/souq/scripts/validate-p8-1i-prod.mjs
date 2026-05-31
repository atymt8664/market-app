#!/usr/bin/env node
/**
 * P8-1I — Final admin production verification (no secrets).
 * Guards, bundle markers, and public page loads for all admin surfaces.
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
      headers: { "User-Agent": "souq-p8-1i-prod-verify", ...(init?.headers || {}) },
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function body(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "souq-p8-1i-prod-verify" } });
    return await res.text();
  } catch {
    return "";
  }
}

function guardOk(code, label) {
  if (code === 401 || code === 403) ok(`${label} (${code})`);
  else bad(`${label} (${code}) — expected 401/403`);
}

/** Admin API routes — unauthenticated must be rejected. */
const ADMIN_API_ROUTES = [
  ["GET", "/api/admin/me", "admin/me"],
  ["GET", "/api/admin/dashboard", "dashboard"],
  ["GET", "/api/admin/analytics", "analytics"],
  ["GET", "/api/admin/monitoring", "monitoring"],
  ["GET", "/api/admin/operations/summary", "operations/summary"],
  ["GET", "/api/admin/operations/founder", "operations/founder"],
  ["GET", "/api/admin/users", "users"],
  ["GET", "/api/admin/logs", "logs"],
  ["GET", "/api/admin/settings", "settings"],
  ["GET", "/api/admin/reports", "reports"],
  ["GET", "/api/admin/reports/stats", "reports/stats"],
  ["GET", "/api/admin/support/tickets", "support/tickets"],
  ["GET", "/api/admin/verification/requests", "verification/requests"],
  ["GET", "/api/admin/verification/stats", "verification/stats"],
  ["GET", "/api/admin/staff", "staff"],
  ["GET", "/api/admin/categories", "categories"],
  ["GET", "/api/admin/cities", "cities"],
  ["GET", "/api/admin/ads", "ads"],
  ["GET", "/api/admin/active-app-users-count", "presence"],
];

/** Admin frontend routes — must return SPA shell (200). */
const ADMIN_PAGES = [
  ["/admin-login", "admin-login"],
  ["/admin", "dashboard"],
  ["/admin/ads", "ads"],
  ["/admin/reports", "reports"],
  ["/admin/support", "support"],
  ["/admin/users", "users"],
  ["/admin/verification", "verification"],
  ["/admin/analytics", "analytics"],
  ["/admin/operations", "operations"],
  ["/admin/monitoring", "monitoring"],
  ["/admin/staff", "staff"],
  ["/admin/logs", "logs"],
  ["/admin/settings", "settings"],
  ["/admin/billing", "billing"],
  ["/admin/plans", "plans"],
  ["/admin/categories", "categories"],
  ["/admin/cities", "cities"],
];

/** Lazy chunks expected in production bundle. */
const ADMIN_CHUNKS = [
  "admin-",
  "admin-ads-",
  "admin-reports-",
  "admin-support-",
  "admin-users-",
  "admin-verification-",
  "admin-stats-",
  "admin-operations-",
  "admin-monitoring-",
  "admin-staff-",
  "admin-logs-",
  "admin-settings-",
  "admin-billing-",
  "admin-plans-",
  "admin-categories-",
  "admin-cities-",
];

console.log(`=== P8-1I Production admin verify (${API_BASE}) ===`);

let c = await status(`${API_BASE}/api/healthz`);
c === 200 ? ok(`api/healthz (${c})`) : bad(`api/healthz (${c})`);

c = await status(`${API_BASE}/api/readyz`);
c === 200 || c === 503 ? ok(`api/readyz (${c})`) : bad(`api/readyz (${c})`);

console.log("\n--- Admin API guards ---");
for (const [method, path, label] of ADMIN_API_ROUTES) {
  const code = await status(`${API_BASE}${path}`, { method });
  guardOk(code, label);
}

console.log("\n--- Admin SPA pages ---");
for (const [path, label] of ADMIN_PAGES) {
  const code = await status(`${WWW_BASE}${path}`);
  code === 200 ? ok(`${label} page (${code})`) : bad(`${label} page (${code})`);
}

console.log("\n--- Admin bundle chunks ---");
const html = await body(`${WWW_BASE}/admin-login`);
const indexJs = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!indexJs) {
  bad("could not locate index JS chunk");
} else {
  const indexContent = await body(`${WWW_BASE}${indexJs[1]}`);
  const chunks = [...new Set([...indexContent.matchAll(/[a-z0-9_-]+-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]))];

  for (const prefix of ADMIN_CHUNKS) {
    const chunk = chunks.find((c) => c.startsWith(prefix));
    if (chunk) ok(`${prefix}* chunk (${chunk})`);
    else bad(`${prefix}* chunk missing`);
  }

  const dashboardJs =
    chunks.find((c) => /^admin-[A-Za-z0-9_-]+\.js$/.test(c) && !c.startsWith("admin-login-")) ??
    chunks.find((c) => c.startsWith("admin-") && c.includes("noc"));
  const dashContent = dashboardJs ? await body(`${WWW_BASE}/assets/${dashboardJs}`) : "";
  if (dashContent.includes("p8.admin.noc.metric.cpu_load_value")) {
    ok(`P8-1H NOC cpu_load_value in dashboard chunk (${dashboardJs})`);
  } else {
    bad("P8-1H NOC cpu_load_value missing from dashboard chunk");
  }

  const billingJs = chunks.find((c) => c.startsWith("admin-billing-"));
  if (billingJs) {
    const js = await body(`${WWW_BASE}/assets/${billingJs}`);
    js.includes("p8.admin.billing") || js.includes("data-p10-preview")
      ? ok("billing placeholder boundary markers")
      : bad("billing placeholder markers missing");
  }

  const plansJs = chunks.find((c) => c.startsWith("admin-plans-"));
  if (plansJs) {
    const js = await body(`${WWW_BASE}/assets/${plansJs}`);
    js.includes("p8.admin.plans") || js.includes("data-p10-preview")
      ? ok("plans placeholder boundary markers")
      : bad("plans placeholder markers missing");
  }
}

if (errors.length) {
  console.error(`\n=== P8-1I PRODUCTION VERIFY: FAIL (${errors.length}) ===`);
  process.exit(1);
}

console.log("\n=== P8-1I PRODUCTION VERIFY: PASS ===");
