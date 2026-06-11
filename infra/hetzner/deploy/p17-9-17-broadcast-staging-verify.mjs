/**
 * P17-9-17 — STAGING E2E: platform broadcast (test_audience).
 * API defaults to http://localhost:3001 — set STAGING_API_BASE to override.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(fileURLToPath(import.meta.url));
const apiEnv = join(root, "../../../artifacts/api-server/.env.local");
const OUT = join(root, "p17-9-17-broadcast-staging-verify.json");
const API = (process.env.STAGING_API_BASE || "http://localhost:3001").replace(/\/$/, "");

try {
  for (const line of readFileSync(apiEnv, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] == null) process.env[m[1]] = m[2];
  }
} catch {
  /* optional */
}

process.env.BROADCAST_ENABLED = process.env.BROADCAST_ENABLED || "1";
process.env.BROADCAST_TEST_EMAILS =
  process.env.BROADCAST_TEST_EMAILS || process.env.STAGING_VERIFY_EMAIL || "atymt8664@gmail.com";

const require = createRequire(join(root, "../../../artifacts/api-server/package.json"));
const WebSocket = require("ws");

const report = { ts: new Date().toISOString(), api: API, checks: {}, verdict: "FAIL" };
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
  const r = await fetch(`${API}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
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
  report.verdict = fail ? "FAIL" : "P17_9_17_BROADCAST_STAGING_PASS";
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const health = await fetch(`${API}/api/healthz`);
  if (!health.ok) {
    failCheck("apiHealth", `status ${health.status}`);
    writeReport();
    process.exit(1);
  }
  pass("apiHealth");

  const email = process.env.STAGING_VERIFY_EMAIL?.trim() || "atymt8664@gmail.com";
  const password = process.env.STAGING_VERIFY_PASSWORD?.trim();
  const adminPass = process.env.P17_9_7_ADMIN_PASSWORD?.trim() || process.env.P8H_ADMIN_PASSWORD?.trim() || "";
  const adminKey = process.env.ADMIN_ACCESS_KEY?.trim() || "";

  if (!password) failCheck("credentials", "STAGING_VERIFY_PASSWORD missing");
  if (!adminPass) failCheck("adminCredentials", "P17_9_7_ADMIN_PASSWORD missing");
  if (!adminKey) failCheck("adminAccessKey", "ADMIN_ACCESS_KEY missing");
  if (fail) {
    writeReport();
    process.exit(1);
  }

  const userJar = new Jar();
  const adminJar = new Jar();
  let wsEvents = 0;
  const title = `P17-9-17 STAGING broadcast ${Date.now()}`;
  const body = "تحقق STAGING P17-9-17 — بث رسمي من الإدارة.";

  const loginUser = await req(userJar, "POST", "/api/auth/login", { body: { email, password } });
  if (loginUser.status !== 200) failCheck("userLogin", `status ${loginUser.status}`);
  else pass("userLogin");

  const meUser = await req(userJar, "GET", "/api/auth/me");
  const userCsrf = meUser.json?.csrfToken ?? "";

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

  const countersBefore = await req(userJar, "GET", "/api/account/unread-counters");
  const unreadBefore = countersBefore.json?.notifications ?? 0;

  const draft = await req(adminJar, "POST", "/api/admin/broadcasts", {
    body: { category: "new_feature", title, body, audience: "test_audience" },
    csrf: adminCsrf,
  });
  if (draft.status !== 201) failCheck("adminDraft", draft.raw?.slice(0, 200));
  else pass("adminDraft");

  const broadcastId = draft.json?.id;
  const confirmToken = draft.json?.confirmToken;

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

  const sent = await req(adminJar, "POST", `/api/admin/broadcasts/${broadcastId}/send`, {
    body: { confirmToken },
    csrf: adminCsrf,
  });
  if (sent.status !== 200) failCheck("adminSend", sent.raw?.slice(0, 200));
  else pass("adminSend");

  let notification = null;
  for (let i = 0; i < 25; i++) {
    await sleep(1200);
    const list = await req(userJar, "GET", "/api/notifications");
    if (list.status === 200 && Array.isArray(list.json)) {
      notification = list.json.find(
        (n) =>
          String(n.type).startsWith("announcement.platform.") &&
          Number(n.metadata?.broadcastId ?? n.entityId) === Number(broadcastId),
      );
      if (notification) break;
    }
  }
  ws.close();

  if (!notification) failCheck("notificationDelivered", "missing");
  else pass("notificationDelivered");

  const countersAfter = await req(userJar, "GET", "/api/account/unread-counters");
  if ((countersAfter.json?.notifications ?? 0) <= unreadBefore) {
    failCheck("counterBump", `${unreadBefore} -> ${countersAfter.json?.notifications}`);
  } else pass("counterBump");

  if (wsEvents < 1) failCheck("realtime", `events ${wsEvents}`);
  else pass("realtime");

  if (notification?.id) {
    await req(userJar, "PATCH", `/api/notifications/${notification.id}/read`, { csrf: userCsrf });
    pass("markRead");
  }

  writeReport();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  failCheck("fatal", err.message);
  writeReport();
  process.exit(1);
});
