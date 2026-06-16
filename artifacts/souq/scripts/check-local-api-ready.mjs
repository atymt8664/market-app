#!/usr/bin/env node
/**
 * Local preview guard — Vite proxies /api/* to API_PROXY_TARGET (default localhost:3001).
 * Constitution: STAGING/local API only (see docs/PROJECT_CONSTITUTION.md).
 */
const target =
  process.env.API_PROXY_TARGET?.trim() || "http://localhost:3001";
const probeUrl = `${target.replace(/\/$/, "")}/api/categories`;

try {
  const res = await fetch(probeUrl, { signal: AbortSignal.timeout(4000) });
  if (res.ok) {
    // eslint-disable-next-line no-console -- dev diagnostics
    console.info(`[souq] Local API ready: ${probeUrl} → ${res.status}`);
    process.exit(0);
  }
  // eslint-disable-next-line no-console -- dev diagnostics
  console.error(
    `[souq] Local API unreachable for preview: ${probeUrl} → HTTP ${res.status}. ` +
      "Start STAGING-backed API: from repo root run `pnpm dev:api` (port 3001).",
  );
  process.exit(1);
} catch (err) {
  // eslint-disable-next-line no-console -- dev diagnostics
  console.error(
    `[souq] Local API not running at ${target}. ` +
      "Vite preview/dev proxy /api/* will return 500 until API is up.\n" +
      "Fix: from repo root run `pnpm dev:api` (uses artifacts/api-server/.env.local → STAGING DB).\n" +
      `Detail: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
