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

  let appText = "";
  if (assetMatch) {
    const indexJs = await (await fetch(`${WEB}${assetMatch[0]}`)).text();
    const mainMatch =
      indexJs.match(/\/assets\/main-[A-Za-z0-9_-]+\.js/) ??
      indexJs.match(/import\("\.\/(main-[A-Za-z0-9_-]+\.js)"\)/);
    const mainPath = mainMatch
      ? mainMatch[0].startsWith("/assets/")
        ? mainMatch[0]
        : `/assets/${mainMatch[1] ?? mainMatch[0].replace(/^import\("\.\//, "").replace(/"\)$/, "")}`
      : null;
    if (mainPath) {
      const mainJs = await (await fetch(`${WEB}${mainPath}`)).text();
      const appMatch =
        mainJs.match(/\/assets\/App-[A-Za-z0-9_-]+\.js/) ??
        mainJs.match(/import\("\.\/(App-[A-Za-z0-9_-]+\.js)"\)/);
      const appPath = appMatch
        ? appMatch[0].startsWith("/assets/")
          ? appMatch[0]
          : `/assets/${appMatch[1] ?? appMatch[0].replace(/^import\("\.\//, "").replace(/"\)$/, "")}`
        : null;
      if (appPath) {
        const appRes = await fetch(`${WEB}${appPath}`);
        appText = await appRes.text();
        record("WEB App chunk 200", appRes.ok, { status: appRes.status, chunk: appPath });
      }
    }
  }

  record(
    "WEB App chunk mentions P6 security routes",
    appText.includes("account-security-alerts") && appText.includes("account-security-sessions"),
    null,
  );
  record(
    "WEB App chunk mentions privacy activity route",
    appText.includes("account-privacy-activity"),
    null,
  );

  for (const path of [
    "/account/security/sessions",
    "/account/security/alerts",
    "/account/security/log",
    "/account/security/two-factor",
    "/account/privacy/activity",
  ]) {
    const routeRes = await fetch(`${WEB}${path}`, { redirect: "manual" });
    record(`WEB route ${path} SPA shell`, routeRes.ok, { status: routeRes.status });
  }

  console.log(JSON.stringify({ api: API, web: WEB, steps, pass: true }, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ api: API, web: WEB, steps, pass: false, error: String(e.message || e) }, null, 2));
  process.exit(1);
});
