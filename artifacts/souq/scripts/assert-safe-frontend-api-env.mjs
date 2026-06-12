/**
 * Blocks Local dev/preview from targeting Production API (PROJECT_CONSTITUTION).
 * Used by vite.config.ts — not for production Vercel builds.
 */

const PRODUCTION_API_HOSTS = new Set([
  "api.souq-arab.com",
  "www.souq-arab.com",
  "souq-arab.com",
]);

function hostOfUrl(raw) {
  if (!raw?.trim()) return "";
  try {
    return new URL(raw.trim()).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isProductionApiHost(host) {
  if (!host) return false;
  if (PRODUCTION_API_HOSTS.has(host)) return true;
  return host.endsWith(".souq-arab.com");
}

/**
 * @param {string} label
 * @param {string | undefined} rawUrl
 */
export function assertSafeLocalFrontendApiTarget(label, rawUrl) {
  if (!rawUrl?.trim()) return;

  if (process.env.ALLOW_PRODUCTION_API_PROXY === "1") {
    // eslint-disable-next-line no-console -- dev-only constitution override warning
    console.warn(
      `[souq env-guard] ${label}: ALLOW_PRODUCTION_API_PROXY=1 override active — local must not use this in normal work.`,
    );
    return;
  }

  const host = hostOfUrl(rawUrl);
  if (isProductionApiHost(host)) {
    throw new Error(
      `[souq env-guard] ${label} points to Production (${host}). ` +
        "Local dev/preview must use http://localhost:3001 or STAGING API only. " +
        "Never mix STAGING and PRODUCTION (docs/PROJECT_CONSTITUTION.md).",
    );
  }
}

/**
 * @param {{ apiProxyTarget?: string; viteApiBaseUrl?: string }} opts
 */
export function assertSafeLocalFrontendApiEnv(opts) {
  assertSafeLocalFrontendApiTarget(
    "API_PROXY_TARGET",
    opts.apiProxyTarget ?? "http://localhost:3001",
  );
  assertSafeLocalFrontendApiTarget("VITE_API_BASE_URL", opts.viteApiBaseUrl);
}
