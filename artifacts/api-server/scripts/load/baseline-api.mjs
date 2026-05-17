/**
 * Node baseline load (no k6 required) — Phase 7A.5.
 * API_BASE_URL=https://api.souq-arab.com CONCURRENCY=5 DURATION_SEC=20 node scripts/load/baseline-api.mjs
 */
const baseUrl = (process.env.API_BASE_URL || "https://api.souq-arab.com").replace(/\/$/, "");
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 5));
const durationSec = Math.max(5, Number(process.env.DURATION_SEC || 20));

const latencies = [];

async function oneRequest(path) {
  const started = performance.now();
  const res = await fetch(`${baseUrl}${path}`, { headers: { accept: "application/json" } });
  await res.arrayBuffer();
  const ms = performance.now() - started;
  latencies.push(ms);
  return res.status;
}

async function worker(until) {
  const paths = ["/api/ads?limit=20", "/api/ads?q=test&limit=10", "/api/healthz"];
  let i = 0;
  while (Date.now() < until) {
    const status = await oneRequest(paths[i % paths.length]);
    if (status >= 500) process.stderr.write(`5xx on ${paths[i % paths.length]}\n`);
    i += 1;
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[idx];
}

const until = Date.now() + durationSec * 1000;
await Promise.all(Array.from({ length: concurrency }, () => worker(until)));

const sorted = [...latencies].sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      baseUrl,
      concurrency,
      durationSec,
      requests: sorted.length,
      p50Ms: Math.round(percentile(sorted, 0.5)),
      p95Ms: Math.round(percentile(sorted, 0.95)),
      p99Ms: Math.round(percentile(sorted, 0.99)),
      maxMs: Math.round(sorted[sorted.length - 1] || 0),
    },
    null,
    2,
  ),
);
