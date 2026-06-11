/**
 * P17-9-13 — Push delivery chain diagnostic (production API).
 * Env: PROD_VERIFY_EMAIL, PROD_VERIFY_PASSWORD (from .env.local or shell).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const apiEnv = join(root, "../../../artifacts/api-server/.env.local");
const OUT = join(root, "p17-9-13-push-chain-diagnose.json");
const API = (process.env.PROD_API_BASE || "https://api.souq-arab.com").replace(/\/$/, "");
const WEB = (process.env.PROD_WEB_BASE || "https://www.souq-arab.com").replace(/\/$/, "");

try {
  for (const line of readFileSync(apiEnv, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] == null) process.env[m[1]] = m[2];
  }
} catch {
  /* optional */
}

const report = {
  ts: new Date().toISOString(),
  phase: "P17-9-13",
  api: API,
  web: WEB,
  chain: {},
  verdict: "INCOMPLETE",
};

function chain(step, status, detail = null) {
  report.chain[step] = { status, detail };
}

class Jar {
  constructor() {
    this.m = new Map();
  }
  ingest(h) {
    if (!h) return;
    (Array.isArray(h) ? h : [h]).forEach((p) => {
      const [pair] = p.split(";");
      const i = pair.indexOf("=");
      if (i > 0) this.m.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    });
  }
  hdr() {
    return [...this.m].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function req(jar, method, path, body) {
  const h = { "Content-Type": "application/json" };
  if (jar.hdr()) h.Cookie = jar.hdr();
  const r = await fetch(`${API}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  jar.ingest(r.headers.getSetCookie?.() ?? r.headers.get("set-cookie"));
  const t = await r.text();
  let j = null;
  try {
    j = JSON.parse(t);
  } catch {
    j = { _raw: t.slice(0, 200) };
  }
  return { status: r.status, json: j };
}

async function main() {
  const vapidRes = await fetch(`${API}/api/push/vapid-public-key`);
  const vapidJson = vapidRes.ok ? await vapidRes.json() : null;
  chain(
    "1_vapid",
    vapidRes.ok && vapidJson?.publicKey ? "PASS" : "FAIL",
    vapidJson?.publicKey ? `${String(vapidJson.publicKey).slice(0, 12)}…` : `HTTP ${vapidRes.status}`,
  );

  const swRes = await fetch(`${WEB}/sw.js`);
  const swBody = swRes.ok ? await swRes.text() : "";
  const swHasVisibilityGate =
    swBody.includes("visibilityState") && swBody.includes("appVisible");
  const swHasBranding =
    swBody.includes("notification-badge-96.png") &&
    swBody.includes("notification-large-192.png") &&
    !swBody.includes('badge: "/icons/pwa-icon-192.png"');
  const swOk = swRes.ok && swBody.includes("push") && swHasVisibilityGate && swHasBranding;
  chain(
    "12_sw_deployed",
    swOk ? "PASS" : "FAIL",
    swOk
      ? "p17-9-13 branding + visibility gate"
      : !swHasBranding
        ? "missing monochrome badge — redeploy frontend"
        : "old sw.js — redeploy frontend",
  );

  const badgeRes = await fetch(`${WEB}/icons/notification-badge-96.png`);
  chain(
    "12b_notification_badge_asset",
    badgeRes.ok ? "PASS" : "FAIL",
    badgeRes.ok ? "monochrome badge reachable" : `HTTP ${badgeRes.status}`,
  );

  const email = process.env.PROD_VERIFY_EMAIL?.trim();
  const password = process.env.PROD_VERIFY_PASSWORD?.trim();
  if (!email || !password) {
    chain("auth", "SKIP", "PROD_VERIFY_EMAIL/PASSWORD missing — set in .env.local");
    report.verdict = "INCOMPLETE";
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const jar = new Jar();
  const login = await req(jar, "POST", "/api/auth/login", { email, password });
  if (login.status !== 200) {
    chain("auth", "FAIL", `login HTTP ${login.status}`);
    report.verdict = "FAIL";
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  chain("auth", "PASS", `userId=${login.json?.user?.id ?? "?"}`);

  const pushStatus = await req(jar, "GET", "/api/push/status");
  const ps = pushStatus.json ?? {};
  chain("1_subscription_db", ps.subscriptionCount > 0 ? "PASS" : "FAIL", {
    configured: ps.configured,
    subscribed: ps.subscribed,
    subscriptionCount: ps.subscriptionCount,
  });
  chain("2_user_id_match", login.json?.user?.id ? "PASS" : "FAIL", login.json?.user?.id);
  chain("3_subscription_active", ps.subscriptionCount > 0 ? "PASS" : "FAIL", "via /api/push/status");

  const prefs = await req(jar, "GET", "/api/account/notification-preferences");
  chain("9_preferences", prefs.status === 200 ? "PASS" : "FAIL", {
    pushEnabled: prefs.json?.pushEnabled,
    quietHoursEnabled: prefs.json?.quietHoursEnabled,
  });

  report.chainNotes = {
    "4_endpoint_valid": "requires DB row — subscriptionCount>0 implies endpoint stored",
    "5_vapid": report.chain["1_vapid"]?.status,
    "6_push_worker": "check VPS: docker ps | grep push-worker + logs push_delivered|push_skipped",
    "7_event_to_push": "support.reply / broadcast → createNotification → routePushDelivery",
    "8_dlq": "production uses Redis LIST not pg-boss DLQ",
    "10_ws_skip": "fixed P17-9-13 — server no longer skips on WS",
    "11_lock_screen": "retest after deploy",
    "13_payload": "buildPushNotificationPayload v1",
    "14_showNotification": "SW when !appVisible",
    "17_origin": `frontend=${WEB} api=${API} — push subscription scoped to ${WEB}`,
  };

  const subOk = ps.subscriptionCount > 0;
  const vapidOk = report.chain["1_vapid"]?.status === "PASS";
  const swDeployed = report.chain["12_sw_deployed"]?.status === "PASS";
  const badgeAsset = report.chain["12b_notification_badge_asset"]?.status === "PASS";
  report.verdict = subOk && vapidOk && swDeployed && badgeAsset ? "CHAIN_READY" : "CHAIN_BLOCKED";
  if (!subOk) report.rootCause = "NO_PUSH_SUBSCRIPTION — enable /account/notifications or wait for auto-sync after deploy";
  else if (!swDeployed || !badgeAsset) report.rootCause = "FRONTEND_BRANDING_NOT_DEPLOYED — deploy souq sw.js v7 + notification-badge assets";
  else report.rootCause = "chain ready — verify push-worker logs for push_delivered after admin event";

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(subOk && vapidOk ? 0 : 1);
}

main().catch((err) => {
  report.fatal = err.message;
  report.verdict = "FAIL";
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.error(err);
  process.exit(1);
});
