/**
 * Phase 7A.4 — Production API smoke (no secrets).
 * Detects FTS via rank field `r` in search pagination cursor when q= is set.
 */
const API = "https://api.souq-arab.com";

function decodeCursor(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(String(raw), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

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
    firstKeys:
      Array.isArray(body) && body[0] && typeof body[0] === "object"
        ? Object.keys(body[0]).sort()
        : null,
  };
}

async function postView(adId) {
  const res = await fetch(`${API}/api/ads/${adId}/view`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: "{}",
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, counted: body?.counted };
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

console.log("=== Phase 7A.4 production FTS smoke ===\n");

const health = await get("/api/healthz");
record(
  "GET /api/healthz",
  health.status === 200,
  `status=${health.status}`,
);

const searchCases = [
  ["/api/ads?q=test&limit=5", "test"],
  ["/api/ads?q=" + encodeURIComponent("سيارة") + "&limit=5", "arabic"],
  ["/api/ads?q=Berlin&limit=5", "berlin_q"],
  ["/api/ads?city=Berlin&limit=5", "berlin_city"],
];

let ftsSignals = 0;
for (const [path, label] of searchCases) {
  const r = await get(path);
  const cur = decodeCursor(r.nextCursor);
  const hasRank = cur && typeof cur.r === "number";
  if (path.includes("q=") && hasRank) ftsSignals += 1;
  const shapeOk =
    r.status === 200 &&
    r.isArray &&
    (r.body.length === 0 ||
      (r.firstKeys &&
        r.firstKeys.includes("id") &&
        r.firstKeys.includes("title") &&
        !r.firstKeys.includes("searchRank")));
  record(
    `GET ${path.split("?")[0]} (${label})`,
    shapeOk && r.status !== 500,
    `status=${r.status} len=${r.isArray ? r.body.length : "n/a"} limit=${r.limit ?? "-"} hasMore=${r.hasMore ?? "-"} cursorHasRank=${hasRank}`,
  );
}

const pag = await get("/api/ads?limit=999999");
record(
  "GET /api/ads?limit=999999",
  pag.status === 200 && pag.limit === "100" && pag.isArray,
  `status=${pag.status} limit=${pag.limit ?? "missing"}`,
);

const pag2 = await get("/api/ads?limit=10");
const cur2 = pag2.nextCursor;
record(
  "pagination headers",
  pag2.status === 200 && pag2.limit === "10" && (pag2.hasMore === "true" || pag2.hasMore === "false"),
  `limit=${pag2.limit} hasMore=${pag2.hasMore} nextCursor=${cur2 ? "present" : "absent"}`,
);

for (const p of ["/api/ads/featured", "/api/ads/recommended"]) {
  const r = await get(p);
  record(
    `GET ${p}`,
    r.status === 200 && r.isArray,
    `status=${r.status} len=${r.isArray ? r.body.length : "n/a"}`,
  );
}

const list = await get("/api/ads?limit=1");
const adId = list.isArray && list.body?.[0]?.id ? list.body[0].id : null;
if (adId) {
  const v1 = await postView(adId);
  const v2 = await postView(adId);
  record(
    "POST /api/ads/:id/view x2",
    v1.status === 200 &&
      v2.status === 200 &&
      v1.counted === true &&
      v2.counted === false,
    `id=${adId} first=${v1.counted} second=${v2.counted}`,
  );
} else {
  record("POST /api/ads/:id/view x2", false, "no ad id");
}

const expectFts = process.env.EXPECT_FTS_ACTIVE === "1";
if (expectFts) {
  record(
    "FTS active (cursor rank r on q= search)",
    ftsSignals >= 1,
    `q= endpoints with rank cursor: ${ftsSignals}/3`,
  );
} else {
  record(
    "FTS pre-flag (no rank in cursor expected)",
    ftsSignals === 0,
    `rank cursors on q= searches: ${ftsSignals} (0 expected before flag)`,
  );
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
