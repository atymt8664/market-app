/**
 * Phase 7A.2 production smoke tests (no secrets).
 * Usage: node artifacts/api-server/scripts/_phase7a2_prod_smoke.mjs
 */
const API = "https://api.souq-arab.com";

function pickHeaders(res) {
  const h = {};
  for (const k of [
    "x-pagination-limit",
    "x-pagination-has-more",
    "x-pagination-next-cursor",
  ]) {
    const v = res.headers.get(k);
    if (v != null) h[k] = v;
  }
  return h;
}

async function req(method, path, opts = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: { accept: "application/json", ...(opts.headers || {}) },
    body: opts.body,
    redirect: "manual",
  });
  let body;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    body = await res.text();
  }
  return { status: res.status, headers: pickHeaders(res), body, raw: res };
}

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

async function waitForPaginationHeaders(maxWaitMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const r = await req("GET", "/api/ads?limit=5");
    if (r.headers["x-pagination-limit"]) return { deployed: true, elapsedMs: Date.now() - start, r };
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  return { deployed: false, elapsedMs: maxWaitMs };
}

console.log("=== Phase 7A.2 prod smoke ===");
console.log("API:", API);

const deployWait = await waitForPaginationHeaders();
record(
  "deploy_pagination_headers_visible",
  deployWait.deployed,
  deployWait.deployed
    ? `headers live after ~${Math.round(deployWait.elapsedMs / 1000)}s`
    : `no X-Pagination-Limit after ${deployWait.elapsedMs}ms`,
);

const limitAbuse = await req("GET", "/api/ads?limit=999999");
const limitHdr = limitAbuse.headers["x-pagination-limit"];
const limitIsArray = Array.isArray(limitAbuse.body);
record(
  "ads_limit_999999_clamped",
  limitAbuse.status === 200 && limitHdr === "100" && limitIsArray,
  `status=${limitAbuse.status} X-Pagination-Limit=${limitHdr ?? "missing"} isArray=${limitIsArray} len=${limitIsArray ? limitAbuse.body.length : "n/a"}`,
);

const limitNormal = await req("GET", "/api/ads?limit=10");
record(
  "ads_limit_10_array",
  limitNormal.status === 200 &&
    Array.isArray(limitNormal.body) &&
    limitNormal.headers["x-pagination-limit"] === "10",
  `status=${limitNormal.status} limitHdr=${limitNormal.headers["x-pagination-limit"] ?? "missing"} len=${Array.isArray(limitNormal.body) ? limitNormal.body.length : "n/a"} hasMore=${limitNormal.headers["x-pagination-has-more"] ?? "missing"}`,
);

if (limitNormal.headers["x-pagination-next-cursor"]) {
  record("ads_next_cursor_present_when_has_more", true, "next-cursor header set");
} else {
  record(
    "ads_next_cursor_present_when_has_more",
    limitNormal.headers["x-pagination-has-more"] === "false" || !limitNormal.headers["x-pagination-has-more"],
    `hasMore=${limitNormal.headers["x-pagination-has-more"] ?? "missing"} (cursor only if more pages)`,
  );
}

const featured = await req("GET", "/api/ads/featured");
record(
  "ads_featured",
  featured.status === 200 && Array.isArray(featured.body),
  `status=${featured.status} isArray=${Array.isArray(featured.body)}`,
);

const notif = await req("GET", "/api/notifications");
record(
  "notifications_auth_gate",
  notif.status === 401,
  `status=${notif.status} (expected 401 without session)`,
);

const conv = await req("GET", "/api/conversations");
record(
  "conversations_auth_gate",
  conv.status === 401,
  `status=${conv.status} (expected 401 without session)`,
);

const mine = await req("GET", "/api/ads/mine");
record(
  "ads_mine_auth_gate",
  mine.status === 401,
  `status=${mine.status} (expected 401 without session)`,
);

const fav = await req("GET", "/api/ads/favorites");
record(
  "ads_favorites_auth_gate",
  fav.status === 401,
  `status=${fav.status} (expected 401 without session)`,
);

const adsList = await req("GET", "/api/ads?limit=1");
let adId = null;
if (Array.isArray(adsList.body) && adsList.body[0]?.id) adId = adsList.body[0].id;

if (adId) {
  const view = await req("POST", `/api/ads/${adId}/view`, {
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const counted =
    view.body && typeof view.body === "object" && "counted" in view.body
      ? view.body.counted
      : undefined;
  record(
    "ad_view_post",
    view.status === 200 && typeof counted === "boolean",
    `status=${view.status} counted=${counted}`,
  );
} else {
  record("ad_view_post", false, "no ad id from list to test view");
}

const health = await req("GET", "/api/healthz");
record("healthz", health.status === 200, `status=${health.status}`);

console.log("\n--- Results ---");
let allOk = true;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) allOk = false;
  console.log(`${mark}  ${r.name}: ${r.detail}`);
}
console.log(allOk ? "\nALL PASS" : "\nSOME FAILED");
process.exit(allOk ? 0 : 1);
