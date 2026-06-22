/**
 * Validates GET /api/ads/feed-meta (home new-ads banner).
 * Run with local API: node scripts/validate-home-feed-meta.mjs
 */
const API = process.env.API_BASE?.replace(/\/$/, "") || "http://127.0.0.1:3001";

async function get(path) {
  const res = await fetch(`${API}${path}`);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const since = new Date().toISOString();
const recent = await get(`/api/ads/feed-meta?since=${encodeURIComponent(since)}&afterId=0`);
assert(recent.status === 200, `recent meta status ${recent.status}`);
assert(typeof recent.body.count === "number", "count is number");
assert(typeof recent.body.newestAdId === "number", "newestAdId is number");
assert(
  recent.body.newestCreatedAt === null || typeof recent.body.newestCreatedAt === "string",
  "newestCreatedAt shape",
);
assert(recent.body.count === 0, "future since should yield count 0");

const epoch = await get("/api/ads/feed-meta?since=1970-01-01T00:00:00.000Z&afterId=0");
assert(epoch.status === 200, `epoch meta status ${epoch.status}`);
assert(epoch.body.count >= 0, "epoch count >= 0");

const bad = await get("/api/ads/feed-meta");
assert(bad.status === 400, "missing since -> 400");

console.log("validate-home-feed-meta.mjs PASS", {
  epochCount: epoch.body.count,
  newestAdId: epoch.body.newestAdId,
});
