/**
 * P17-9-13 — Push verification (automated API + optional device matrix merge).
 *
 * Env:
 *   PROD_VERIFY_EMAIL, PROD_VERIFY_PASSWORD
 *   P17_9_7_ADMIN_PASSWORD (founder), ADMIN_ACCESS_KEY
 *   PROD_API_BASE (default https://api.souq-arab.com)
 *   PROD_WEB_BASE (default https://www.souq-arab.com)
 *   P17_9_13_DEVICE_MATRIX — path to filled device-matrix JSON (required for final PASS)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(fileURLToPath(import.meta.url));
const apiEnv = join(root, "../../../artifacts/api-server/.env.local");
const OUT = join(root, "p17-9-13-push-prod-verify.json");
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

const require = createRequire(join(root, "../../../artifacts/api-server/package.json"));
const WebSocket = require("ws");

const report = {
  ts: new Date().toISOString(),
  phase: "P17-9-13",
  api: API,
  web: WEB,
  automated: {},
  device: null,
  checks: {},
  verdict: "FAIL",
  automatedVerdict: "FAIL",
  deviceVerdict: "PENDING",
};

let fail = 0;
const pass = (k, v = "PASS") => {
  report.checks[k] = v;
};
const failCheck = (k, reason) => {
  report.checks[k] = `FAIL: ${reason}`;
  fail = 1;
};

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

async function req(jar, method, path, { body, csrf, headers = {} } = {}) {
  const h = { ...headers };
  if (jar.hdr()) h.Cookie = jar.hdr();
  if (csrf) h["X-CSRF-Token"] = csrf;
  if (body) h["Content-Type"] = "application/json";
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
    j = { _raw: t.slice(0, 300) };
  }
  return { status: r.status, json: j, raw: t };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function writeReport() {
  report.automatedVerdict = fail ? "FAIL" : "PASS";
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

function latestBroadcastNotification(items, broadcastId) {
  return items
    .filter((n) => {
      const t = String(n.type ?? "").toLowerCase();
      if (!t.startsWith("announcement.platform.")) return false;
      const metaId = n.metadata?.broadcastId ?? n.entityId;
      return Number(metaId) === Number(broadcastId);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function countBroadcastNotifications(items, broadcastId) {
  return items.filter((n) => {
    const t = String(n.type ?? "").toLowerCase();
    if (!t.startsWith("announcement.platform.")) return false;
    const metaId = n.metadata?.broadcastId ?? n.entityId;
    return Number(metaId) === Number(broadcastId);
  }).length;
}

function isPassValue(v) {
  return v === "PASS" || v === "SKIP_EXPECTED";
}

function evaluateDeviceMatrix(matrix) {
  const deviceFails = [];
  const critical = [
    ["app_background", "osNotification"],
    ["app_killed", "osNotification"],
    ["lock_screen", "osNotification"],
  ];

  for (const [scenario, field] of critical) {
    const row = matrix.scenarios?.[scenario];
    const val = row?.[field];
    if (!isPassValue(val)) {
      deviceFails.push(`${scenario}.${field}=${val ?? "missing"}`);
    }
  }

  const pref = matrix.preferences;
  if (!isPassValue(pref?.announcementsOffBlocks)) {
    deviceFails.push(`preferences.announcementsOffBlocks=${pref?.announcementsOffBlocks ?? "missing"}`);
  }
  if (!isPassValue(pref?.announcementsOnDelivers)) {
    deviceFails.push(`preferences.announcementsOnDelivers=${pref?.announcementsOnDelivers ?? "missing"}`);
  }

  const qh = matrix.quietHours;
  if (!isPassValue(qh?.pushSuppressed)) {
    deviceFails.push(`quietHours.pushSuppressed=${qh?.pushSuppressed ?? "missing"}`);
  }

  return {
    verdict: deviceFails.length === 0 ? "PASS" : "FAIL",
    failures: deviceFails,
  };
}

async function sendTestBroadcast(adminJar, adminCsrf, userJar, userCsrf, tag) {
  const title = `P17-9-13 Push verify ${tag} ${Date.now()}`;
  const body = `تحقق P17-9-13 — ${tag}. يمكن تجاهل هذه الرسالة.`;

  const draft = await req(adminJar, "POST", "/api/admin/broadcasts", {
    body: {
      category: "platform_update",
      title,
      body,
      audience: "test_audience",
    },
    csrf: adminCsrf,
  });
  if (draft.status !== 201) {
    throw new Error(`draft failed ${draft.status}: ${draft.raw?.slice(0, 120)}`);
  }

  const broadcastId = draft.json?.id;
  const confirmToken = draft.json?.confirmToken;
  if (!broadcastId || !confirmToken) throw new Error("draft missing id/confirmToken");

  let wsEvents = 0;
  const wsUrl = API.replace(/^http/, "ws") + "/api/ws";
  const ws = new WebSocket(wsUrl, { headers: { Cookie: userJar.hdr() } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("ws timeout")), 15_000);
    ws.on("open", () => {
      clearTimeout(t);
      resolve();
    });
    ws.on("error", reject);
  });
  ws.on("message", (buf) => {
    try {
      const msg = JSON.parse(String(buf));
      if (msg?.type === "notification.created") wsEvents += 1;
    } catch {
      /* ignore */
    }
  });

  const countersBefore = await req(userJar, "GET", "/api/account/unread-counters");
  const unreadBefore = countersBefore.json?.notifications ?? 0;

  const sent = await req(adminJar, "POST", `/api/admin/broadcasts/${broadcastId}/send`, {
    body: { confirmToken },
    csrf: adminCsrf,
  });
  if (sent.status !== 200) throw new Error(`send failed ${sent.status}`);

  let notification = null;
  for (let i = 0; i < 24; i++) {
    await sleep(1500);
    const list = await req(userJar, "GET", "/api/notifications");
    if (list.status === 200 && Array.isArray(list.json)) {
      notification = latestBroadcastNotification(list.json, broadcastId);
      if (notification) break;
    }
  }

  ws.close();

  const countersAfter = await req(userJar, "GET", "/api/account/unread-counters");
  const unreadAfter = countersAfter.json?.notifications ?? 0;

  return {
    broadcastId,
    notification,
    wsEvents,
    unreadBefore,
    unreadAfter,
    title,
  };
}

async function main() {
  const email = process.env.PROD_VERIFY_EMAIL?.trim();
  const password = process.env.PROD_VERIFY_PASSWORD?.trim();
  const adminPass =
    process.env.P17_9_7_ADMIN_PASSWORD?.trim() ||
    process.env.P8H_ADMIN_PASSWORD?.trim() ||
    "";
  const adminKey = process.env.ADMIN_ACCESS_KEY?.trim() || "";

  if (!email || !password) failCheck("credentials", "PROD_VERIFY_EMAIL/PASSWORD missing");
  if (!adminPass) failCheck("adminCredentials", "P17_9_7_ADMIN_PASSWORD missing");
  if (!adminKey) failCheck("adminAccessKey", "ADMIN_ACCESS_KEY missing");

  const vapid = await fetch(`${API}/api/push/vapid-public-key`);
  if (vapid.ok && (await vapid.json())?.publicKey) pass("vapidPublicKey");
  else failCheck("vapidPublicKey", `HTTP ${vapid.status}`);

  const sw = await fetch(`${WEB}/sw.js`);
  if (sw.ok) {
    const body = await sw.text();
    body.includes("push") && body.includes("notificationclick") && body.includes("dedupKey")
      ? pass("serviceWorker")
      : failCheck("serviceWorker", "missing handlers");
  } else failCheck("serviceWorker", `HTTP ${sw.status}`);

  const manifest = await fetch(`${WEB}/manifest.webmanifest`);
  manifest.ok ? pass("pwaManifest") : failCheck("pwaManifest", `HTTP ${manifest.status}`);

  if (fail) {
    writeReport();
    process.exit(1);
  }

  const userJar = new Jar();
  const adminJar = new Jar();

  const loginUser = await req(userJar, "POST", "/api/auth/login", {
    body: { email, password },
  });
  if (loginUser.status !== 200) failCheck("userLogin", `status ${loginUser.status}`);
  else pass("userLogin");

  const meUser = await req(userJar, "GET", "/api/auth/me");
  const userCsrf = meUser.json?.csrfToken ?? "";
  const userId = meUser.json?.id;
  if (!userId) failCheck("userMe", "no user id");
  else pass("userMe");

  const pushStatus = await req(userJar, "GET", "/api/push/status");
  if (pushStatus.status === 200) {
    report.automated.pushStatus = pushStatus.json;
    pushStatus.json?.configured ? pass("pushConfigured") : failCheck("pushConfigured", "false");
    Number(pushStatus.json?.subscriptionCount) > 0
      ? pass("pushSubscribed")
      : failCheck("pushSubscribed", "subscriptionCount=0 — enable device push on test phone first");
  } else failCheck("pushStatus", `HTTP ${pushStatus.status}`);

  const adminLogin = await req(adminJar, "POST", "/api/admin-login", {
    body: { password: adminPass },
    headers: { "X-Admin-Access-Key": adminKey },
  });
  if (adminLogin.status !== 200) failCheck("adminLogin", `status ${adminLogin.status}`);
  else pass("adminLogin");

  const adminMe = await req(adminJar, "GET", "/api/admin/me");
  const adminCsrf = adminMe.json?.csrfToken ?? "";
  if (!adminMe.json?.isFounder) failCheck("adminFounder", "founder required");
  else pass("adminFounder");

  if (fail) {
    writeReport();
    process.exit(1);
  }

  // --- Preferences: announcements OFF blocks delivery ---
  const prefsOff = await req(userJar, "PATCH", "/api/account/notification-preferences", {
    body: { notifyAnnouncements: false },
    csrf: userCsrf,
  });
  prefsOff.status === 200 ? pass("prefsPatchOff") : failCheck("prefsPatchOff", `HTTP ${prefsOff.status}`);

  const listBeforeOff = await req(userJar, "GET", "/api/notifications?limit=50");
  const countBeforeOff = Array.isArray(listBeforeOff.json) ? listBeforeOff.json.length : 0;

  try {
    const blocked = await sendTestBroadcast(adminJar, adminCsrf, userJar, userCsrf, "prefs-off");
    if (blocked.notification) {
      failCheck("prefsGateBlocks", "notification created while announcements off");
    } else {
      pass("prefsGateBlocks");
    }
    report.automated.prefsOffBroadcastId = blocked.broadcastId;
  } catch (err) {
    failCheck("prefsGateBlocks", err.message);
  }

  const prefsOn = await req(userJar, "PATCH", "/api/account/notification-preferences", {
    body: { notifyAnnouncements: true, pushEnabled: true },
    csrf: userCsrf,
  });
  prefsOn.status === 200 ? pass("prefsPatchOn") : failCheck("prefsPatchOn", `HTTP ${prefsOn.status}`);

  // --- Delivery with WS: realtime + counters + dedup (single row per broadcast) ---
  let delivery = null;
  try {
    delivery = await sendTestBroadcast(adminJar, adminCsrf, userJar, userCsrf, "delivery");
    if (!delivery.notification) failCheck("notificationDelivered", "no in-app notification");
    else pass("notificationDelivered");

    if (delivery.wsEvents < 1) failCheck("realtime", `ws events ${delivery.wsEvents}`);
    else pass("realtime");

    if (delivery.unreadAfter <= delivery.unreadBefore) {
      failCheck("counterBump", `${delivery.unreadBefore} -> ${delivery.unreadAfter}`);
    } else pass("counterBump");

    const listAfter = await req(userJar, "GET", "/api/notifications?limit=50");
    const dupCount = Array.isArray(listAfter.json)
      ? countBroadcastNotifications(listAfter.json, delivery.broadcastId)
      : 0;
    dupCount === 1 ? pass("dedupInApp") : failCheck("dedupInApp", `count=${dupCount}`);
    report.automated.deliveryBroadcastId = delivery.broadcastId;
  } catch (err) {
    failCheck("deliveryFlow", err.message);
  }

  // --- Quiet hours PATCH (in-app still allowed; push suppression verified on device) ---
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const start = `${hh}:${mm}`;
  const endH = (now.getHours() + 1) % 24;
  const end = `${String(endH).padStart(2, "0")}:${mm}`;

  const qhOn = await req(userJar, "PATCH", "/api/account/notification-preferences", {
    body: {
      quietHoursEnabled: true,
      quietHoursStart: start,
      quietHoursEnd: end,
      quietHoursTimezone: tz,
    },
    csrf: userCsrf,
  });
  qhOn.status === 200 ? pass("quietHoursPatch") : failCheck("quietHoursPatch", `HTTP ${qhOn.status}`);
  report.automated.quietHoursWindow = { start, end, tz };

  const qhOff = await req(userJar, "PATCH", "/api/account/notification-preferences", {
    body: { quietHoursEnabled: false },
    csrf: userCsrf,
  });
  qhOff.status === 200 ? pass("quietHoursRestore") : failCheck("quietHoursRestore", `HTTP ${qhOff.status}`);

  report.automatedVerdict = fail ? "FAIL" : "PASS";

  const matrixPath =
    process.env.P17_9_13_DEVICE_MATRIX?.trim() ||
    join(root, "p17-9-13-device-matrix.json");

  if (!existsSync(matrixPath)) {
    report.deviceVerdict = "PENDING";
    report.checks.deviceMatrix = `PENDING: fill ${matrixPath} after real-device run (see runbook)`;
    report.verdict = "FAIL";
    writeReport();
    process.exit(1);
  }

  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  report.device = {
    tester: matrix.tester ?? null,
    deviceModel: matrix.deviceModel ?? null,
    androidVersion: matrix.androidVersion ?? null,
    testedAt: matrix.testedAt ?? null,
    pushSubscribed: matrix.pushSubscribed ?? null,
  };

  const deviceEval = evaluateDeviceMatrix(matrix);
  report.deviceVerdict = deviceEval.verdict;
  report.deviceFailures = deviceEval.failures;
  report.checks.deviceMatrix = deviceEval.verdict;

  if (deviceEval.verdict !== "PASS") fail = 1;

  report.verdict = fail ? "P17_9_13_PUSH_VERIFY_FAIL" : "P17_9_13_PUSH_VERIFY_PASS";
  writeReport();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  failCheck("fatal", err.message);
  writeReport();
  process.exit(1);
});
