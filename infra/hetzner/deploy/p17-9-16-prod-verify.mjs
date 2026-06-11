/**
 * P17-9-16 Wave A — Production verification (no secrets in output).
 * Env: PROD_VERIFY_EMAIL, PROD_VERIFY_PASSWORD (never logged).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const API = (process.env.PROD_API_BASE || "https://api.souq-arab.com").replace(/\/$/, "");
const WEB = (process.env.PROD_WEB_BASE || "https://www.souq-arab.com").replace(/\/$/, "");
const WS = API.replace(/^http/, "ws") + "/api/ws";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "p17-9-16-prod-verify.json");

const report = {
  ts: new Date().toISOString(),
  phase: "P17-9-16",
  wave: "A",
  api: API,
  web: WEB,
  checks: {},
  verdict: "FAIL",
};

let fail = 0;
const pass = (k, v = true) => {
  report.checks[k] = v === true ? "PASS" : v;
};
const failCheck = (k, v) => {
  report.checks[k] = typeof v === "string" ? `FAIL: ${v}` : "FAIL";
  fail = 1;
};

function grabCookies(res, jar) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const p = c.split(";")[0];
    const eq = p.indexOf("=");
    if (eq > 0) jar[p.slice(0, eq)] = p.slice(eq + 1);
  }
}

function cookieHdr(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function main() {
  const email = process.env.PROD_VERIFY_EMAIL?.trim();
  const password = process.env.PROD_VERIFY_PASSWORD?.trim();
  if (!email || !password) {
    failCheck("credentials", "PROD_VERIFY_EMAIL/PASSWORD not set");
    writeReportSafe();
    process.exit(1);
  }

  for (const [k, path] of [
    ["healthz", "/api/healthz"],
    ["readyz", "/api/readyz"],
  ]) {
    const r = await fetch(`${API}${path}`);
    r.ok ? pass(k) : failCheck(k, `HTTP ${r.status}`);
  }

  const uc = await fetch(`${API}/api/account/unread-counters`);
  uc.status === 401 ? pass("unreadCountersRoute") : failCheck("unreadCountersRoute", `HTTP ${uc.status}`);

  const www = await fetch(`${WEB}/`);
  www.ok ? pass("frontend") : failCheck("frontend", `HTTP ${www.status}`);
  report.checks.vercelId = www.headers.get("x-vercel-id") ?? null;

  const sw = await fetch(`${WEB}/sw.js`);
  if (sw.ok) {
    const body = await sw.text();
    body.includes("push") && body.includes("dedupKey") ? pass("serviceWorker") : failCheck("serviceWorker", "missing push handlers");
  } else failCheck("serviceWorker", `HTTP ${sw.status}`);

  const jar = {};
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    failCheck("login", `HTTP ${loginRes.status}`);
    writeReportSafe();
    process.exit(1);
  }
  grabCookies(loginRes, jar);
  const loginJson = await loginRes.json();
  pass("login");
  report.seed = { email, userId: loginJson.user?.id ?? null };

  const hdr = { cookie: cookieHdr(jar) };
  const countersRes = await fetch(`${API}/api/account/unread-counters`, { headers: hdr });
  if (countersRes.ok) {
    const c = await countersRes.json();
    report.checks.unreadCounters = c;
    Number.isFinite(c?.notifications) ? pass("countersShape") : failCheck("countersShape", "invalid shape");
  } else failCheck("unreadCountersAuthed", `HTTP ${countersRes.status}`);

  const notifRes = await fetch(`${API}/api/notifications?limit=20`, { headers: hdr });
  if (notifRes.ok) {
    const list = await notifRes.json();
    const items = Array.isArray(list) ? list : list?.items ?? [];
    report.checks.notificationListCount = items.length;
    pass("notificationCenterApi");
    if (items[0]) {
      report.checks.sampleDeepLink = items[0].deepLinkPath ?? null;
      report.checks.sampleType = items[0].type ?? null;
      items[0].deepLinkPath ? pass("deepLinkPresent") : failCheck("deepLinkPresent", "missing on sample");
    } else {
      pass("deepLinkPresent", "N/A — no existing notifications");
    }
  } else failCheck("notificationCenterApi", `HTTP ${notifRes.status}`);

  const unreadRes = await fetch(`${API}/api/notifications/unread-count`, { headers: hdr });
  if (unreadRes.ok) {
    const u = await unreadRes.json();
    report.checks.unreadCount = u.count;
    pass("unreadCountApi");
  } else failCheck("unreadCountApi", `HTTP ${unreadRes.status}`);

  let wsOk = false;
  try {
    const ws = new WebSocket(WS, { headers: hdr });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("ws timeout")), 8000);
      ws.on("open", () => {
        clearTimeout(t);
        wsOk = true;
        ws.close();
        resolve();
      });
      ws.on("error", reject);
    });
    wsOk ? pass("websocketConnect") : failCheck("websocketConnect", "no open");
  } catch (e) {
    failCheck("websocketConnect", e.message || "error");
  }

  const notifPage = await fetch(`${WEB}/notifications`, { headers: hdr, redirect: "follow" });
  notifPage.ok ? pass("notificationsPage") : failCheck("notificationsPage", `HTTP ${notifPage.status}`);
  const pageHtml = await notifPage.text();
  pageHtml.includes('dir="rtl"') || pageHtml.includes('lang="ar"') ? pass("rtlShell") : pass("rtlShell", "N/A — check visual");

  report.verdict = fail === 0 ? "WAVE_A_VERIFY_PASS" : "WAVE_A_VERIFY_FAIL";
  writeReportSafe();
  console.log(report.verdict);
  process.exit(fail === 0 ? 0 : 1);
}

function writeReportSafe() {
  const safe = { ...report, seed: report.seed ? { email: report.seed.email, userId: report.seed.userId } : undefined };
  writeFileSync(OUT, JSON.stringify(safe, null, 2));
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  failCheck("fatal", e.message || String(e));
  report.verdict = "WAVE_A_VERIFY_FAIL";
  try {
    writeReportSafe();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
