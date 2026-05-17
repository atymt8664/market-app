/**
 * Phase 7A.2.1 production smoke (no secrets).
 */
const API = "https://api.souq-arab.com";

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
  const ct = res.headers.get("content-type") || "";
  let body = null;
  if (ct.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    await res.text();
  }
  return {
    status: res.status,
    limit: res.headers.get("x-pagination-limit"),
    hasMore: res.headers.get("x-pagination-has-more"),
    nextCursor: res.headers.get("x-pagination-next-cursor"),
    isArray: Array.isArray(body),
    body,
  };
}

async function waitForHotfix(maxMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const r = await get("/api/ads?limit=999999");
    if (r.status === 200 && r.limit === "100") {
      return { ok: true, elapsedMs: Date.now() - start };
    }
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  return { ok: false, elapsedMs: maxMs };
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

console.log("=== Phase 7A.2.1 prod smoke ===");

const deploy = await waitForHotfix();
record(
  "hotfix_deployed",
  deploy.ok,
  deploy.ok ? `live after ~${Math.round(deploy.elapsedMs / 1000)}s` : "limit=999999 still not 200/100",
);

const cases = [
  ["/api/ads?limit=999999", { status: 200, limit: "100", needHasMore: true }],
  ["/api/ads?limit=-5", { status: 200, limit: "50" }],
  ["/api/ads?limit=abc", { status: 200, limit: "50" }],
  ["/api/ads?limit=10", { status: 200, limit: "10" }],
];

for (const [path, expect] of cases) {
  const r = await get(path);
  const hasMoreOk = expect.needHasMore ? r.hasMore != null && r.hasMore !== "" : true;
  const ok =
    r.status === expect.status &&
    r.isArray &&
    r.limit === expect.limit &&
    hasMoreOk;
  record(
    `GET ${path}`,
    ok,
    `status=${r.status} isArray=${r.isArray} limit=${r.limit ?? "missing"} hasMore=${r.hasMore ?? "missing"}`,
  );
}

const list = await get("/api/ads?limit=1");
let adId = list.isArray && list.body?.[0]?.id ? list.body[0].id : null;
if (adId) {
  const viewRes = await fetch(`${API}/api/ads/${adId}/view`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: "{}",
  });
  let viewBody = null;
  try {
    viewBody = await viewRes.json();
  } catch {
    viewBody = null;
  }
  const counted =
    viewBody && typeof viewBody === "object" && "counted" in viewBody
      ? viewBody.counted
      : undefined;
  record(
    "POST /api/ads/:id/view",
    viewRes.status === 200 && typeof counted === "boolean",
    `status=${viewRes.status} counted=${counted}`,
  );
} else {
  record("POST /api/ads/:id/view", false, "no ad id from list");
}

console.log("\n--- Results ---");
let allOk = true;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) allOk = false;
  console.log(`${mark}  ${r.name}: ${r.detail}`);
}
console.log(allOk ? "\nALL PASS" : "\nSOME FAILED");
process.exit(allOk ? 0 : 1);
