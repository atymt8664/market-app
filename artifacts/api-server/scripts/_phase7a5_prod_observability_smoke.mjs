/**
 * Phase 7A.5 — Production observability + regression smoke (no secrets, read-only).
 * PRODUCTION API only — do not point at staging.
 */
const API = process.env.API_BASE_URL || "https://api.souq-arab.com";
const DEPLOY_WAIT_MS = Number(process.env.DEPLOY_WAIT_MS || 180_000);
const POLL_MS = 4_000;

function decodeCursor(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(String(raw), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function get(path, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: "application/json", ...headers },
  });
  const requestId = res.headers.get("x-request-id");
  let body = null;
  const ct = res.headers.get("content-type") || "";
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
    body,
    requestId,
    limit: res.headers.get("x-pagination-limit"),
    hasMore: res.headers.get("x-pagination-has-more"),
    nextCursor: res.headers.get("x-pagination-next-cursor"),
  };
}

async function waitForDeploy() {
  const start = Date.now();
  while (Date.now() - start < DEPLOY_WAIT_MS) {
    const live = await get("/api/livez");
    if (live.status === 200 && live.body?.status === "ok") {
      return { ok: true, elapsedMs: Date.now() - start };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return { ok: false, elapsedMs: DEPLOY_WAIT_MS };
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

console.log(`=== Phase 7A.5 production smoke (${API}) ===\n`);

const deploy = await waitForDeploy();
record(
  "7A.5 deploy visible (/api/livez)",
  deploy.ok,
  deploy.ok ? `live after ~${Math.round(deploy.elapsedMs / 1000)}s` : `no /api/livez within ${DEPLOY_WAIT_MS}ms`,
);

const health = await get("/api/healthz");
record(
  "GET /api/healthz",
  health.status === 200 && health.body?.status === "ok",
  `status=${health.status} requestId=${health.requestId ? "yes" : "no"}`,
);

const live = await get("/api/livez");
record(
  "GET /api/livez",
  live.status === 200 && live.body?.status === "ok" && typeof live.body?.uptimeSeconds === "number",
  `status=${live.status} uptime=${live.body?.uptimeSeconds ?? "n/a"} requestId=${live.requestId ? "yes" : "no"}`,
);

const ready = await get("/api/readyz");
record(
  "GET /api/readyz",
  ready.status === 200 && ready.body?.status === "ready" && ready.body?.checks?.database === "ok",
  `status=${ready.status} db=${ready.body?.checks?.database ?? "n/a"} latencyMs=${ready.body?.dbLatencyMs ?? "n/a"}`,
);

const ads = await get("/api/ads?limit=5");
record(
  "GET /api/ads",
  ads.status === 200 && Array.isArray(ads.body),
  `status=${ads.status} requestId=${ads.requestId ? "yes" : "no"} paginationLimit=${ads.limit ?? "-"}`,
);

const pag = await get("/api/ads?limit=10");
record(
  "pagination headers",
  pag.status === 200 && pag.limit !== null,
  `status=${pag.status} X-Pagination-Limit=${pag.limit ?? "missing"}`,
);

const search = await get("/api/ads?q=test&limit=5");
const searchCursor = decodeCursor(search.nextCursor);
const ftsRank = searchCursor && typeof searchCursor.r === "number";
record(
  "GET /api/ads?q= (search + FTS cursor)",
  search.status === 200 && Array.isArray(search.body) && search.status !== 500,
  `status=${search.status} len=${Array.isArray(search.body) ? search.body.length : "n/a"} cursorHasRank=${ftsRank} requestId=${search.requestId ? "yes" : "no"}`,
);

const cap = await get("/api/ads?limit=999999");
record(
  "pagination cap (no 500)",
  cap.status === 200 && cap.limit === "100",
  `status=${cap.status} cappedLimit=${cap.limit ?? "missing"}`,
);

const metrics = await get("/api/observability/metrics");
record(
  "GET /api/observability/metrics (unauthenticated)",
  metrics.status === 401 || metrics.status === 403,
  `status=${metrics.status} (must not be 200 public)`,
);

record(
  "X-Request-Id on API responses",
  Boolean(health.requestId && ads.requestId && search.requestId),
  `health=${health.requestId ? "yes" : "no"} ads=${ads.requestId ? "yes" : "no"} search=${search.requestId ? "yes" : "no"}`,
);

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  —  ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
