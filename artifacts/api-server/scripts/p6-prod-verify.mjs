/**
 * P6-CLOSURE-DEPLOY — Production verification (API routes + frontend bundle markers).
 * Usage: node artifacts/api-server/scripts/p6-prod-verify.mjs
 */
const API = (process.env.PROD_API_BASE || "https://api.souq-arab.com").replace(/\/$/, "");
const WEB = (process.env.PROD_WEB_BASE || "https://www.souq-arab.com").replace(/\/$/, "");

const steps = [];

function record(name, ok, detail = null) {
  steps.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

async function probeRoute(path, expectStatuses = [401, 403]) {
  const res = await fetch(`${API}/api${path}`, { redirect: "manual" });
  const ok = expectStatuses.includes(res.status);
  return { status: res.status, ok };
}

async function main() {
  for (const path of [
    "/account/sessions",
    "/account/devices",
    "/account/2fa/status",
    "/account/security-log",
    "/account/security-alerts",
    "/account/privacy-preferences",
  ]) {
    const { status, ok } = await probeRoute(path);
    record(`API ${path} exists`, ok, { status, expect: "401/403 not 404" });
  }

  const healthz = await fetch(`${API}/api/healthz`);
  record("API healthz", healthz.ok, { status: healthz.status });

  const indexRes = await fetch(`${WEB}/`);
  const indexHtml = await indexRes.text();
  record("WEB index 200", indexRes.ok, { status: indexRes.status });

  const assetMatch = indexHtml.match(/\/assets\/index-[^"]+\.js/);
  record("WEB index has main chunk", Boolean(assetMatch), assetMatch?.[0] ?? null);

  if (assetMatch) {
    const mainJs = await fetch(`${WEB}${assetMatch[0]}`);
    const mainText = await mainJs.text();
    record("WEB bundle mentions security-alerts route", mainText.includes("security/alerts"), null);
    record("WEB bundle mentions privacy activity route", mainText.includes("privacy/activity"), null);
  }

  console.log(JSON.stringify({ api: API, web: WEB, steps, pass: true }, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ api: API, web: WEB, steps, pass: false, error: String(e.message || e) }, null, 2));
  process.exit(1);
});
