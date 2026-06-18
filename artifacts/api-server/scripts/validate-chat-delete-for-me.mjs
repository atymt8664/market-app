/**
 * P17 — conversation delete-for-me — local API verification only.
 * Requires: running api-server, DATABASE_URL (non-production), migration 030 applied.
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
const BASE = (process.env.TEST_API_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
const PW = "ChatDeleteForMe99!x";

if (!DATABASE_URL) {
  console.log(JSON.stringify({ ok: false, reason: "DATABASE_URL missing" }));
  process.exit(1);
}

const lower = DATABASE_URL.toLowerCase();
for (const p of (process.env.PRODUCTION_DB_HOST_PATTERNS || "nptfxtkedqndkgmrcntn")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)) {
  if (p && lower.includes(p)) {
    console.log(JSON.stringify({ ok: false, reason: "production_db_blocked" }));
    process.exit(1);
  }
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ...(lower.includes("supabase.co") || process.env.PGSSLMODE === "require"
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

function grabCookie(res, jar) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function login(email, password) {
  const jar = { cookie: "" };
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} ${res.status}`);
  grabCookie(res, jar);
  const data = await res.json();
  if (!jar.cookie) throw new Error("no session cookie");
  return { jar, csrf: data.csrfToken, userId: data.user?.id ?? data.id };
}

async function apiPost(pathname, jar, csrf, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.cookie,
      "x-csrf-token": csrf,
    },
    body: body !== undefined ? JSON.stringify(body) : "{}",
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

async function apiGet(pathname, jar) {
  const res = await fetch(`${BASE}${pathname}`, {
    headers: { cookie: jar.cookie },
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

function listItems(data) {
  return Array.isArray(data) ? data : (data.items ?? []);
}

async function unreadMessages(jar) {
  const { data } = await apiGet("/api/account/unread-counters", jar);
  return Number(data.messages ?? 0);
}

async function main() {
  const report = { ok: true, checks: {}, scenarios: {} };
  const cleanup = { convIds: [], adIds: [], userIds: [] };

  try {
    const hz = await fetch(`${BASE}/api/healthz`);
    if (!hz.ok) throw new Error("API not reachable — start dev:api first");
    report.checks.apiHealth = true;

    const tableCheck = await pool.query(
      `select to_regclass('public.conversation_deletes') as t`,
    );
    if (!tableCheck.rows[0]?.t) {
      throw new Error(
        "conversation_deletes table missing — run lib/db/migrations/030_p5_conversation_deletes.sql locally",
      );
    }
    report.checks.migration030 = true;

    const ts = Date.now();
    const hash = await bcrypt.hash(PW, 10);
    const sellerEmail = `del-seller-${ts}@example.invalid`;
    const buyerEmail = `del-buyer-${ts}@example.invalid`;
    const strangerEmail = `del-stranger-${ts}@example.invalid`;

    const sellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [sellerEmail, hash, "Seller D", "+491700000030", "Berlin"],
      )
    ).rows[0].id;
    const buyerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [buyerEmail, hash, "Buyer D", "+491700000031", "Munich"],
      )
    ).rows[0].id;
    const strangerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [strangerEmail, hash, "Stranger", "+491700000032", "Cologne"],
      )
    ).rows[0].id;
    cleanup.userIds.push(sellerId, buyerId, strangerId);

    const cat = await pool.query(
      `select id from categories where is_hidden = false order by id asc limit 1`,
    );
    const categoryId = cat.rows[0]?.id;
    if (!categoryId) throw new Error("no category");

    const ad1Id = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Del Ad One','Desc','Berlin',$2,'S','+491700000033','approved','[]'::jsonb,100,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    const ad2Id = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Del Ad Two','Desc','Berlin',$2,'S','+491700000034','approved','[]'::jsonb,200,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    cleanup.adIds.push(ad1Id, ad2Id);

    const buyer = await login(buyerEmail, PW);
    const seller = await login(sellerEmail, PW);
    const stranger = await login(strangerEmail, PW);

    const start1 = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId: ad1Id });
    const convId = start1.data.id;
    if (!convId) throw new Error(`start conversation failed: ${JSON.stringify(start1.data)}`);
    cleanup.convIds.push(convId);

    await apiPost(`/api/conversations/${convId}/messages`, buyer.jar, buyer.csrf, {
      body: "hello from buyer",
    });
    await apiPost(`/api/conversations/${convId}/messages`, seller.jar, seller.csrf, {
      body: "hello from seller",
    });

    // hide → appears in hidden, not inbox
    const hideRes = await apiPost(`/api/conversations/${convId}/hide-for-me`, buyer.jar, buyer.csrf);
    report.scenarios.hideOk = hideRes.res.status === 200 && hideRes.data.ok === true;
    const inboxAfterHide = listItems((await apiGet("/api/conversations", buyer.jar)).data);
    const hiddenAfterHide = listItems((await apiGet("/api/conversations/hidden", buyer.jar)).data);
    report.scenarios.hideNotInInbox = !inboxAfterHide.some((c) => c.id === convId);
    report.scenarios.hideInHidden = hiddenAfterHide.some((c) => c.id === convId);

    // unhide → back in inbox
    const unhideRes = await apiPost(`/api/conversations/${convId}/unhide-for-me`, buyer.jar, buyer.csrf);
    report.scenarios.unhideOk = unhideRes.res.status === 200;
    const inboxAfterUnhide = listItems((await apiGet("/api/conversations", buyer.jar)).data);
    report.scenarios.unhideInInbox = inboxAfterUnhide.some((c) => c.id === convId);

    // delete → not in inbox nor hidden
    const delRes = await apiPost(`/api/conversations/${convId}/delete-for-me`, buyer.jar, buyer.csrf);
    report.scenarios.deleteOk = delRes.res.status === 200 && delRes.data.ok === true;
    const inboxAfterDelete = listItems((await apiGet("/api/conversations", buyer.jar)).data);
    const hiddenAfterDelete = listItems((await apiGet("/api/conversations/hidden", buyer.jar)).data);
    report.scenarios.deleteNotInInbox = !inboxAfterDelete.some((c) => c.id === convId);
    report.scenarios.deleteNotInHidden = !hiddenAfterDelete.some((c) => c.id === convId);

    // idempotency delete
    const delAgain = await apiPost(`/api/conversations/${convId}/delete-for-me`, buyer.jar, buyer.csrf);
    report.scenarios.deleteIdempotent = delAgain.res.status === 200 && delAgain.data.ok === true;

    // restore → back in inbox
    const restoreRes = await apiPost(
      `/api/conversations/${convId}/restore-for-me`,
      buyer.jar,
      buyer.csrf,
    );
    report.scenarios.restoreOk = restoreRes.res.status === 200;
    const inboxAfterRestore = listItems((await apiGet("/api/conversations", buyer.jar)).data);
    report.scenarios.restoreInInbox = inboxAfterRestore.some((c) => c.id === convId);

    // delete after hide → clears hidden
    await apiPost(`/api/conversations/${convId}/hide-for-me`, buyer.jar, buyer.csrf);
    await apiPost(`/api/conversations/${convId}/delete-for-me`, buyer.jar, buyer.csrf);
    const hiddenAfterDeleteFromHide = listItems(
      (await apiGet("/api/conversations/hidden", buyer.jar)).data,
    );
    report.scenarios.deleteAfterHideClearsHidden = !hiddenAfterDeleteFromHide.some(
      (c) => c.id === convId,
    );

    // unread excludes deleted
    const unreadWhileDeleted = await unreadMessages(buyer.jar);
    report.scenarios.unreadZeroWhileDeleted = unreadWhileDeleted === 0;

    // incoming message auto-restore
    await apiPost(`/api/conversations/${convId}/messages`, seller.jar, seller.csrf, {
      body: "new message after delete",
    });
    const inboxAfterIncoming = listItems((await apiGet("/api/conversations", buyer.jar)).data);
    report.scenarios.incomingAutoRestore = inboxAfterIncoming.some((c) => c.id === convId);
    const unreadAfterRestore = await unreadMessages(buyer.jar);
    report.scenarios.unreadAfterAutoRestore = unreadAfterRestore >= 1;

    // seller still sees conversation
    const sellerInbox = listItems((await apiGet("/api/conversations", seller.jar)).data);
    report.scenarios.sellerStillHasConv = sellerInbox.some((c) => c.id === convId);

    // non-member → 403
    const forbidden = await apiPost(
      `/api/conversations/${convId}/delete-for-me`,
      stranger.jar,
      stranger.csrf,
    );
    report.scenarios.nonMember403 = forbidden.res.status === 403;

    // consolidation after delete: same conv id for ad2
    await apiPost(`/api/conversations/${convId}/delete-for-me`, buyer.jar, buyer.csrf);
    const start2 = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId: ad2Id });
    report.scenarios.consolidationSameConvId = start2.data.id === convId;
    const detail = await apiGet(`/api/conversations/${convId}`, buyer.jar);
    const refIds = (detail.data.referencedAds ?? []).map((r) => r.adId).sort((a, b) => a - b);
    report.scenarios.adReferencesPersist =
      refIds.includes(ad1Id) && refIds.includes(ad2Id);

    // bulk delete: second conv with other seller not needed — use restore then hide two paths
  } catch (e) {
    report.ok = false;
    report.error = e instanceof Error ? e.message : String(e);
  } finally {
    for (const convId of [...new Set(cleanup.convIds)]) {
      await pool.query("delete from conversations where id = $1", [convId]).catch(() => {});
    }
    for (const adId of cleanup.adIds) {
      await pool.query("delete from ads where id = $1", [adId]).catch(() => {});
    }
    if (cleanup.userIds.length) {
      await pool
        .query("delete from users where id = any($1::int[])", [cleanup.userIds])
        .catch(() => {});
    }
    await pool.end();
  }

  const s = report.scenarios;
  report.checks.allScenariosPass =
    s.hideOk &&
    s.hideNotInInbox &&
    s.hideInHidden &&
    s.unhideOk &&
    s.unhideInInbox &&
    s.deleteOk &&
    s.deleteNotInInbox &&
    s.deleteNotInHidden &&
    s.deleteIdempotent &&
    s.restoreOk &&
    s.restoreInInbox &&
    s.deleteAfterHideClearsHidden &&
    s.unreadZeroWhileDeleted &&
    s.incomingAutoRestore &&
    s.unreadAfterAutoRestore &&
    s.sellerStillHasConv &&
    s.nonMember403 &&
    s.consolidationSameConvId &&
    s.adReferencesPersist;

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok && report.checks.allScenariosPass ? 0 : 1);
}

void main();
