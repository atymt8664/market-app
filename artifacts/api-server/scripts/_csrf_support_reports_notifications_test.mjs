/**
 * Local/staging: user CSRF on support ticket, report, notification read paths.
 * Does not log passwords, tokens, cookies, or DATABASE_URL.
 */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, step: "env", reason: "DATABASE_URL missing" }));
  process.exit(1);
}

const lower = DATABASE_URL.toLowerCase();
const blocked = (process.env.PRODUCTION_DB_HOST_PATTERNS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
for (const p of blocked) {
  if (p && lower.includes(p)) {
    console.log(JSON.stringify({ ok: false, step: "guard", reason: "DATABASE_URL matches production blocklist" }));
    process.exit(1);
  }
}

const useSsl =
  lower.includes("supabase.co") ||
  lower.includes("sslmode=require") ||
  process.env.PGSSLMODE === "require";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

const BASE = "http://127.0.0.1:3001";
const PW = "CsrfSrn99!x";
const ts = Date.now();
const actorEmail = `csrf-srn-a-${ts}@example.invalid`;
const targetEmail = `csrf-srn-t-${ts}@example.invalid`;

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function jsonFetch(method, rel, jar, csrf, withCsrf, bodyObj) {
  const headers = { "content-type": "application/json" };
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}${rel}`, {
    method,
    headers,
    credentials: "include",
    body: bodyObj != null ? JSON.stringify(bodyObj) : undefined,
  });
}

async function patchFetch(rel, jar, csrf, withCsrf) {
  const headers = {};
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}${rel}`, { method: "PATCH", headers, credentials: "include" });
}

async function main() {
  const out = { ok: true, steps: {} };
  const jar = { cookie: "" };
  const hash = await bcrypt.hash(PW, 10);

  const insT = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [targetEmail, hash, "SRN Target", "+491111111201", "Berlin"],
  );
  const targetId = insT.rows[0].id;

  const insA = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [actorEmail, hash, "SRN Actor", "+491111111202", "Munich"],
  );
  const actorId = insA.rows[0].id;

  const nIns = await pool.query(
    `insert into notifications (user_id, type, title, body) values ($1, 'test.csrf', 'T', 'B') returning id`,
    [actorId],
  );
  const notifId = nIns.rows[0].id;
  out.steps.seed = { actorId, targetId, notifId };

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: actorEmail, password: PW }),
  });
  grabCookie(login, jar);
  out.steps.loginStatus = login.status;

  const me = await fetch(`${BASE}/api/auth/me`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  const mej = await me.json().catch(() => ({}));
  const csrf = typeof mej.csrfToken === "string" ? mej.csrfToken : "";
  out.steps.meHasCsrfShape = csrf.length >= 32;

  const ticketBody = {
    subject: "CSRF support test",
    message: "Message body for support ticket CSRF phase eight test.",
    category: "general",
  };

  const rTicketNo = await jsonFetch("POST", "/api/support/tickets", jar, csrf, false, ticketBody);
  out.steps.postSupportTicketNoCsrf = rTicketNo.status;

  const rTicketOk = await jsonFetch("POST", "/api/support/tickets", jar, csrf, true, ticketBody);
  out.steps.postSupportTicketWithCsrf = rTicketOk.status;

  const reportBody = {
    targetUserId: targetId,
    reason: "other",
    description: "Report description for CSRF phase eight integration test.",
  };

  const rRepNo = await jsonFetch("POST", "/api/reports", jar, csrf, false, reportBody);
  out.steps.postReportsNoCsrf = rRepNo.status;

  const rRepOk = await jsonFetch("POST", "/api/reports", jar, csrf, true, reportBody);
  out.steps.postReportsWithCsrf = rRepOk.status;

  const rReadOneNo = await patchFetch(`/api/notifications/${notifId}/read`, jar, csrf, false);
  out.steps.patchNotificationReadNoCsrf = rReadOneNo.status;

  const rReadOneOk = await patchFetch(`/api/notifications/${notifId}/read`, jar, csrf, true);
  out.steps.patchNotificationReadWithCsrf = rReadOneOk.status;

  await pool.query(
    `insert into notifications (user_id, type, title, body) values ($1, 'test.csrf2', 'T2', 'B2')`,
    [actorId],
  );

  const rReadAllNo = await patchFetch("/api/notifications/read-all", jar, csrf, false);
  out.steps.patchNotificationsReadAllNoCsrf = rReadAllNo.status;

  const rReadAllOk = await patchFetch("/api/notifications/read-all", jar, csrf, true);
  out.steps.patchNotificationsReadAllWithCsrf = rReadAllOk.status;

  const notifList = await fetch(`${BASE}/api/notifications`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.getNotificationsStatus = notifList.status;

  const ticketsMine = await fetch(`${BASE}/api/support/tickets/mine`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.getSupportTicketsMineStatus = ticketsMine.status;

  const listAds = await fetch(`${BASE}/api/ads?limit=1`);
  out.steps.listAdsPublicStatus = listAds.status;

  const conv = await fetch(`${BASE}/api/conversations`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.conversationsStatus = conv.status;

  let adminDash = 0;
  try {
    const r = await fetch(`${BASE}/api/admin/dashboard`, {
      headers: jar.cookie ? { cookie: jar.cookie } : {},
      credentials: "include",
    });
    adminDash = r.status;
  } catch {
    adminDash = 0;
  }
  out.steps.adminDashboardAsUserStatus = adminDash;

  out.ok =
    rTicketNo.status === 403 &&
    rTicketOk.status === 201 &&
    rRepNo.status === 403 &&
    rRepOk.status === 200 &&
    rReadOneNo.status === 403 &&
    rReadOneOk.status === 200 &&
    rReadAllNo.status === 403 &&
    rReadAllOk.status === 200 &&
    notifList.status === 200 &&
    ticketsMine.status === 200 &&
    listAds.status === 200 &&
    conv.status === 200;

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
