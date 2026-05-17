/**
 * Local/staging: user CSRF on conversation mutations + account notification prefs + AI POSTs.
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
const PW = "CsrfConv99!x";
const ts = Date.now();
const sellerEmail = `csrf-conv-s-${ts}@example.invalid`;
const buyerEmail = `csrf-conv-b-${ts}@example.invalid`;

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function jsonFetch(method, rel, jar, csrf, withCsrf, body) {
  const headers = { "content-type": "application/json" };
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}${rel}`, {
    method,
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
}

/** POST with no body (e.g. mark read → 204). */
async function postEmpty(rel, jar, csrf, withCsrf) {
  const headers = {};
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}${rel}`, { method: "POST", headers, credentials: "include" });
}

async function patchOrDelete(method, rel, jar, csrf, withCsrf) {
  const headers = {};
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}${rel}`, { method, headers, credentials: "include" });
}

async function uploadImage(convId, jar, csrf, withCsrf) {
  const buf = Buffer.from(PNG_BASE64, "base64");
  const file = new File([buf], "c.png", { type: "image/png" });
  const fd = new FormData();
  fd.append("image", file);
  const headers = {};
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}/api/conversations/${convId}/messages/upload-image`, {
    method: "POST",
    body: fd,
    credentials: "include",
    headers,
  });
}

async function main() {
  const out = { ok: true, steps: {} };
  const jar = { cookie: "" };
  const hash = await bcrypt.hash(PW, 10);

  const insS = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [sellerEmail, hash, "Conv Seller", "+491111111301", "Berlin"],
  );
  const sellerId = insS.rows[0].id;

  const insB = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [buyerEmail, hash, "Conv Buyer", "+491111111302", "Munich"],
  );
  const buyerId = insB.rows[0].id;

  const cat = await pool.query(`select id from categories where is_hidden = false order by id asc limit 1`);
  const categoryId = cat.rows[0]?.id;
  if (!categoryId) {
    out.ok = false;
    out.steps.reason = "no_category";
    await pool.end();
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  const insAd = await pool.query(
    `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images)
     values ($1, $2, $3, $4, $5, $6, $7, 'approved', '[]'::jsonb) returning id`,
    [
      sellerId,
      "CSRF conv ad",
      "Approved ad for conversation CSRF phase nine integration test.",
      "Berlin",
      categoryId,
      "S",
      "+493333333334",
    ],
  );
  const adId = insAd.rows[0].id;
  out.steps.seed = { sellerId, buyerId, adId };

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: buyerEmail, password: PW }),
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

  const startNo = await jsonFetch("POST", "/api/conversations", jar, csrf, false, { adId });
  out.steps.postConversationsNoCsrf = startNo.status;

  const startOk = await jsonFetch("POST", "/api/conversations", jar, csrf, true, { adId });
  out.steps.postConversationsWithCsrf = startOk.status;
  const startJ = await startOk.json().catch(() => ({}));
  const convId = typeof startJ.id === "number" ? startJ.id : null;
  out.steps.convId = convId;

  if (!convId) {
    out.ok = false;
    await pool.end();
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  const msgNo = await jsonFetch("POST", `/api/conversations/${convId}/messages`, jar, csrf, false, {
    body: "hello csrf phase nine",
  });
  out.steps.postMessagesNoCsrf = msgNo.status;

  const msgOk = await jsonFetch("POST", `/api/conversations/${convId}/messages`, jar, csrf, true, {
    body: "hello with csrf ok",
  });
  out.steps.postMessagesWithCsrf = msgOk.status;

  const upNo = await uploadImage(convId, jar, csrf, false);
  out.steps.uploadImageNoCsrf = upNo.status;

  const upOk = await uploadImage(convId, jar, csrf, true);
  out.steps.uploadImageWithCsrf = upOk.status;

  const hideNo = await jsonFetch("POST", `/api/conversations/${convId}/hide`, jar, csrf, false, {});
  out.steps.postHideNoCsrf = hideNo.status;

  const hideOk = await jsonFetch("POST", `/api/conversations/${convId}/hide`, jar, csrf, true, {});
  out.steps.postHideWithCsrf = hideOk.status;

  const unhideNo = await patchOrDelete("DELETE", `/api/conversations/${convId}/hide`, jar, csrf, false);
  out.steps.deleteHideNoCsrf = unhideNo.status;

  const unhideOk = await patchOrDelete("DELETE", `/api/conversations/${convId}/hide`, jar, csrf, true);
  out.steps.deleteHideWithCsrf = unhideOk.status;

  const patchPrefsNo = await jsonFetch(
    "PATCH",
    "/api/account/notification-preferences",
    jar,
    csrf,
    false,
    { notifyMessages: true },
  );
  out.steps.patchNotificationPrefsNoCsrf = patchPrefsNo.status;

  const patchPrefsOk = await jsonFetch(
    "PATCH",
    "/api/account/notification-preferences",
    jar,
    csrf,
    true,
    { notifyAnnouncements: false },
  );
  out.steps.patchNotificationPrefsWithCsrf = patchPrefsOk.status;

  const readNo = await postEmpty(`/api/conversations/${convId}/read`, jar, csrf, false);
  out.steps.postConversationReadNoCsrf = readNo.status;
  const readOk = await postEmpty(`/api/conversations/${convId}/read`, jar, csrf, true);
  out.steps.postConversationReadWithCsrf = readOk.status;

  const getMsgsForHide = await fetch(`${BASE}/api/conversations/${convId}/messages`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  const msgsArr = await getMsgsForHide.json().catch(() => []);
  const mid = Array.isArray(msgsArr) && msgsArr[0]?.id != null ? Number(msgsArr[0].id) : null;
  out.steps.firstMessageIdForHide = mid;

  if (mid) {
    const hideMsgNo = await jsonFetch(
      "POST",
      `/api/conversations/${convId}/messages/hide-for-me`,
      jar,
      csrf,
      false,
      { messageIds: [mid] },
    );
    out.steps.postHideMessagesNoCsrf = hideMsgNo.status;
    const hideMsgOk = await jsonFetch(
      "POST",
      `/api/conversations/${convId}/messages/hide-for-me`,
      jar,
      csrf,
      true,
      { messageIds: [mid] },
    );
    out.steps.postHideMessagesWithCsrf = hideMsgOk.status;
  }

  const aiImpNo = await jsonFetch("POST", "/api/ai/improve-description", jar, csrf, false, {
    title: "CSRF AI t",
    description: "CSRF AI d",
  });
  out.steps.aiImproveNoCsrf = aiImpNo.status;
  const aiImpOk = await jsonFetch("POST", "/api/ai/improve-description", jar, csrf, true, {
    title: "CSRF AI t",
    description: "CSRF AI d",
  });
  out.steps.aiImproveWithCsrf = aiImpOk.status;

  const aiPrNo = await jsonFetch("POST", "/api/ai/suggest-price", jar, csrf, false, {
    title: "CSRF AI price title",
  });
  out.steps.aiSuggestNoCsrf = aiPrNo.status;
  const aiPrOk = await jsonFetch("POST", "/api/ai/suggest-price", jar, csrf, true, {
    title: "CSRF AI price title",
    description: "d",
  });
  out.steps.aiSuggestWithCsrf = aiPrOk.status;

  const listConv = await fetch(`${BASE}/api/conversations`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.getConversationsStatus = listConv.status;

  const getMsgs = await fetch(`${BASE}/api/conversations/${convId}/messages`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.getMessagesStatus = getMsgs.status;

  const listAds = await fetch(`${BASE}/api/ads?limit=1`);
  out.steps.listAdsPublicStatus = listAds.status;

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

  const uploadOkEnough = upOk.status === 200 || upOk.status === 503;

  const prefsNo403 = patchPrefsNo.status === 403;
  const prefsWithOk =
    patchPrefsOk.status === 200 || patchPrefsOk.status === 503;
  const readNo403 = readNo.status === 403;
  const readWith204 = readOk.status === 204;
  const hideMsgNo403 =
    !mid || out.steps.postHideMessagesNoCsrf === 403;
  const hideMsgWith200 =
    !mid || out.steps.postHideMessagesWithCsrf === 200;
  const aiImpNo403 = aiImpNo.status === 403;
  const aiImpWithOk =
    aiImpOk.status === 200 || aiImpOk.status === 503;
  const aiSugNo403 = aiPrNo.status === 403;
  const aiSugWithOk =
    aiPrOk.status === 200 || aiPrOk.status === 503;
  const no500New =
    patchPrefsNo.status !== 500 &&
    patchPrefsOk.status !== 500 &&
    readNo.status !== 500 &&
    readOk.status !== 500 &&
    aiImpNo.status !== 500 &&
    aiImpOk.status !== 500 &&
    aiPrNo.status !== 500 &&
    aiPrOk.status !== 500 &&
    (!mid ||
      (out.steps.postHideMessagesNoCsrf !== 500 &&
        out.steps.postHideMessagesWithCsrf !== 500));

  out.ok =
    startNo.status === 403 &&
    (startOk.status === 200 || startOk.status === 201) &&
    msgNo.status === 403 &&
    msgOk.status === 201 &&
    upNo.status === 403 &&
    uploadOkEnough &&
    hideNo.status === 403 &&
    hideOk.status === 200 &&
    unhideNo.status === 403 &&
    unhideOk.status === 200 &&
    prefsNo403 &&
    prefsWithOk &&
    readNo403 &&
    readWith204 &&
    hideMsgNo403 &&
    hideMsgWith200 &&
    aiImpNo403 &&
    aiImpWithOk &&
    aiSugNo403 &&
    aiSugWithOk &&
    no500New &&
    listConv.status === 200 &&
    getMsgs.status === 200 &&
    listAds.status === 200 &&
    adminDash === 403;

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
