/**
 * P17-9-16 — Production E2E: report resolution notification copy.
 * Env: PROD_VERIFY_EMAIL, PROD_VERIFY_PASSWORD, P17_9_7_ADMIN_PASSWORD (or P8H_ADMIN_PASSWORD),
 *      ADMIN_ACCESS_KEY (admin login header).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(fileURLToPath(import.meta.url));
const apiEnv = join(root, "../../../artifacts/api-server/.env.local");
const OUT = join(root, "p17-9-16-report-resolution-prod-verify.json");
const API = (process.env.PROD_API_BASE || "https://api.souq-arab.com").replace(/\/$/, "");
const CLOSING = "شكراً لمساهمتك في حماية مجتمع Souq Arab EU. 🛡️";

const SCENARIOS = [
  {
    key: "no_violation",
    reason: "لم يتم العثور على مخالفة.",
    titleIncludes: "تمت مراجعة البلاغ",
    bodyIncludes: "لم نجد أي مخالفة لسياسات المنصة",
  },
  {
    key: "content_removed",
    reason: "تمت إزالة المحتوى المخالف.",
    titleIncludes: "إزالة المحتوى المخالف",
    bodyIncludes: "تم حذف المحتوى المخالف واتخاذ الإجراء المناسب",
  },
  {
    key: "user_warned",
    reason: "تم تحذير المستخدم.",
    titleIncludes: "إجراء بحق المستخدم",
    bodyIncludes: "توجيه تحذير للمستخدم المخالف",
  },
  {
    key: "account_suspended",
    reason: "تم تعليق الحساب.",
    titleIncludes: "إجراء أمني",
    bodyIncludes: "تم تعليق الحساب المخالف وفق سياسات المنصة",
  },
  {
    key: "custom",
    reason: "تم التواصل مع الطرفين وإغلاق البلاغ بعد التوضيح — تحقق P17-9-16.",
    titleIncludes: "تمت مراجعة البلاغ",
    bodyIncludes: "تم التواصل مع الطرفين وإغلاق البلاغ بعد التوضيح",
  },
];

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
  api: API,
  scenarios: {},
  checks: {},
  verdict: "FAIL",
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
    j = { _raw: t.slice(0, 200) };
  }
  return { status: r.status, json: j, raw: t };
}

function latestReportNotification(items, reportId, typePrefix = "report.resolved") {
  return items
    .filter((n) => {
      const t = String(n.type ?? "").toLowerCase();
      if (!t.startsWith(typePrefix)) return false;
      const metaId = n.metadata?.reportId ?? n.entityId;
      return reportId == null || Number(metaId) === Number(reportId);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });

  const email = process.env.PROD_VERIFY_EMAIL?.trim() || "atymt8664@gmail.com";
  const password = process.env.PROD_VERIFY_PASSWORD?.trim();
  const adminPass =
    process.env.P17_9_7_ADMIN_PASSWORD?.trim() ||
    process.env.P8H_ADMIN_PASSWORD?.trim() ||
    "";
  const adminKey = process.env.ADMIN_ACCESS_KEY?.trim() || "";

  if (!password) failCheck("credentials", "PROD_VERIFY_PASSWORD missing");
  if (!adminPass) failCheck("adminCredentials", "P17_9_7_ADMIN_PASSWORD missing");
  if (!adminKey) failCheck("adminAccessKey", "ADMIN_ACCESS_KEY missing");
  if (fail) {
    writeReport();
    process.exit(1);
  }

  const userJar = new Jar();
  const login = await req(userJar, "POST", "/api/auth/login", {
    body: { email, password },
  });
  const me = await req(userJar, "GET", "/api/auth/me");
  const userCsrf = me.json?.csrfToken;
  login.status === 200 ? pass("userLogin") : failCheck("userLogin", `HTTP ${login.status}`);

  const adminJar = new Jar();
  const adminLogin = await req(adminJar, "POST", "/api/admin-login", {
    body: { password: adminPass },
    headers: { "X-Admin-Access-Key": adminKey },
  });
  const adminMe = await req(adminJar, "GET", "/api/admin/me", {
    headers: { "X-Admin-Access-Key": adminKey },
  });
  const adminCsrf = adminMe.json?.csrfToken ?? adminLogin.json?.csrfToken;
  adminLogin.status === 200
    ? pass("adminLogin")
    : failCheck("adminLogin", `HTTP ${adminLogin.status}`);

  const adsRes = await fetch(`${API}/api/ads?limit=30`);
  const adsJson = adsRes.ok ? await adsRes.json() : [];
  const adList = Array.isArray(adsJson) ? adsJson : adsJson?.items ?? [];
  const myId = me.json?.id;
  const candidateAds = adList.filter((a) => a?.id && a.userId !== myId);
  if (!candidateAds.length || !userCsrf) {
    failCheck("targetAd", "no ad or csrf");
    writeReport();
    process.exit(1);
  }

  let wsEvents = 0;
  try {
    const ws = new WebSocket(API.replace(/^http/, "ws") + "/api/ws", {
      headers: { Cookie: userJar.hdr() },
    });
    ws.on("message", (buf) => {
      try {
        const msg = JSON.parse(String(buf));
        if (msg?.type === "notification.created") wsEvents += 1;
      } catch {
        /* ignore */
      }
    });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("ws timeout")), 8000);
      ws.on("open", () => {
        clearTimeout(t);
        resolve(null);
      });
      ws.on("error", reject);
    });
    report.checks.userWs = "connected";

    let created = null;
    let targetAd = null;
    for (const ad of candidateAds) {
      const attempt = await req(userJar, "POST", "/api/reports", {
        body: {
          targetAdId: ad.id,
          reason: "محتوى مخالف",
          description: `P17-9-16 report resolution E2E ${Date.now()}`,
        },
        csrf: userCsrf,
      });
      if (attempt.status === 200 || attempt.status === 201) {
        created = attempt;
        targetAd = ad;
        break;
      }
      if (attempt.status !== 409) {
        created = attempt;
        targetAd = ad;
        break;
      }
    }
    if (created?.status === 200 || created?.status === 201) {
      pass("reportCreate");
      report.checks.reportId = created.json?.id ?? created.json?.report?.id;
      report.checks.targetAdId = targetAd?.id ?? null;
    } else {
      failCheck("reportCreate", created ? `HTTP ${created.status}` : "no unique ad for report");
    }

    await sleep(1500);
    const afterCreate = await req(userJar, "GET", "/api/notifications?limit=30");
    const itemsAfterCreate = Array.isArray(afterCreate.json)
      ? afterCreate.json
      : afterCreate.json?.items ?? [];
    const received = itemsAfterCreate.find((n) => String(n.type) === "report.received");
    if (received) {
      const ok =
        String(received.title).includes("شكر") &&
        String(received.body).includes("تم استلام بلاغك بنجاح") &&
        String(received.body).includes("يقوم فريق المراجعة الآن بدراسة الحالة") &&
        String(received.body).includes("الوقت المتوقع للمراجعة");
      ok ? pass("scenario_received") : failCheck("scenario_received", "copy mismatch");
      report.scenarios.received = {
        title: received.title,
        bodyPreview: String(received.body).slice(0, 120),
      };
    } else {
      failCheck("scenario_received", "report.received not found");
    }

    let reportId = report.checks.reportId;
    if (!reportId) {
      const mine = itemsAfterCreate.find(
        (n) => n.type === "report.received" && n.entityId,
      );
      reportId = mine?.entityId ?? mine?.metadata?.reportId;
    }
    if (!reportId) {
      const adminReports = await req(adminJar, "GET", "/api/admin/reports?limit=20", {
        headers: { "X-Admin-Access-Key": adminKey },
      });
      const rows = adminReports.json?.items ?? adminReports.json ?? [];
      const row =
        rows.find((r) => r.reporterId === myId && r.targetAdId === targetAd.id) ?? rows[0];
      reportId = row?.id;
    }
    report.checks.reportId = reportId;

    if (!reportId || !adminCsrf) {
      failCheck("reportId", "could not resolve report id for closure tests");
    } else {
      for (const scenario of SCENARIOS) {
        const wsBefore = wsEvents;
        await req(adminJar, "PATCH", `/api/admin/reports/${reportId}/status`, {
          body: { status: "under_review" },
          csrf: adminCsrf,
          headers: { "X-CSRF-Token": adminCsrf, "X-Admin-Access-Key": adminKey },
        });
        await sleep(400);
        const resolved = await req(adminJar, "PATCH", `/api/admin/reports/${reportId}/status`, {
          body: { status: "resolved", reason: scenario.reason },
          csrf: adminCsrf,
          headers: { "X-CSRF-Token": adminCsrf, "X-Admin-Access-Key": adminKey },
        });
        await sleep(1200);
        const notifRes = await req(userJar, "GET", "/api/notifications?limit=40");
        const items = Array.isArray(notifRes.json) ? notifRes.json : notifRes.json?.items ?? [];
        const n = latestReportNotification(items, reportId);
        const result = {
          resolveStatus: resolved.status,
          type: n?.type ?? null,
          title: n?.title ?? null,
          body: n?.body ?? null,
          wsBumped: wsEvents > wsBefore,
        };
        report.scenarios[scenario.key] = {
          ...result,
          bodyPreview: String(result.body ?? "").slice(0, 160),
        };
        const genericFail =
          String(result.body ?? "").includes("تم اتخاذ الإجراء المناسب بعد مراجعة البلاغ.") &&
          !scenario.key.includes("action");
        const titleOk = String(result.title ?? "").includes(scenario.titleIncludes);
        const bodyOk = String(result.body ?? "").includes(scenario.bodyIncludes);
        const closingOk = String(result.body ?? "").includes(CLOSING);
        const passScenario =
          resolved.status === 200 &&
          result.type === "report.resolved" &&
          titleOk &&
          bodyOk &&
          closingOk &&
          !genericFail;
        if (passScenario) {
          report.checks[`scenario_${scenario.key}`] = "PASS";
        } else {
          failCheck(
            `scenario_${scenario.key}`,
            `title=${titleOk} body=${bodyOk} closing=${closingOk} generic=${genericFail}`,
          );
        }
      }
    }

    ws.close();
    wsEvents > 0 ? pass("realtimeEvents", `${wsEvents} notification.created`) : failCheck("realtimeEvents", "none");
  } catch (e) {
    failCheck("wsOrFlow", e.message || String(e));
  }

  for (const [k, p] of [
    ["regression_counters", "/api/account/unread-counters"],
    ["regression_notifications", "/api/notifications?limit=5"],
    ["regression_conversations", "/api/conversations"],
    ["regression_support", "/api/support/tickets/mine"],
  ]) {
    const r = await req(userJar, "GET", p);
    r.status === 200 ? pass(k) : failCheck(k, `HTTP ${r.status}`);
  }

  report.verdict = fail === 0 ? "P17_9_16_REPORT_RESOLUTION_PASS" : "P17_9_16_REPORT_RESOLUTION_FAIL";
  writeReport();
  console.log(report.verdict);
  console.log(`Wrote ${OUT}`);
  process.exit(fail === 0 ? 0 : 1);
}

function writeReport() {
  writeFileSync(OUT, JSON.stringify(report, null, 2));
}

main().catch((e) => {
  report.checks.fatal = e.message || String(e);
  report.verdict = "P17_9_16_REPORT_RESOLUTION_FAIL";
  writeReport();
  console.error("FATAL", e);
  process.exit(1);
});
