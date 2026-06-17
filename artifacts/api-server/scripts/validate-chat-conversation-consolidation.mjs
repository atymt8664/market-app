/**
 * Chat conversation consolidation — local API verification only.
 * Requires: running api-server, DATABASE_URL (non-production), migration 029 applied.
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
const PW = "ChatConsolidation99!x";

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
  return { jar, csrf: data.csrfToken };
}

async function apiPost(pathname, jar, csrf, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.cookie,
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(body),
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
  const data = await res.json();
  return { res, data };
}

async function main() {
  const report = { ok: true, checks: {}, scenarios: {} };
  const cleanup = { convIds: [], adIds: [], userIds: [] };

  try {
    const hz = await fetch(`${BASE}/api/healthz`);
    if (!hz.ok) throw new Error("API not reachable — start dev:api first");
    report.checks.apiHealth = true;

    const tableCheck = await pool.query(
      `select to_regclass('public.conversation_ad_references') as t`,
    );
    if (!tableCheck.rows[0]?.t) {
      throw new Error(
        "conversation_ad_references table missing — run lib/db/migrations/029_conversation_ad_references.sql locally",
      );
    }
    report.checks.migration029 = true;

    const ts = Date.now();
    const hash = await bcrypt.hash(PW, 10);
    const sellerEmail = `chat-seller-${ts}@example.invalid`;
    const buyerEmail = `chat-buyer-${ts}@example.invalid`;
    const otherSellerEmail = `chat-other-${ts}@example.invalid`;

    const sellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [sellerEmail, hash, "Seller B", "+491700000020", "Berlin"],
      )
    ).rows[0].id;
    const buyerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [buyerEmail, hash, "Buyer A", "+491700000021", "Munich"],
      )
    ).rows[0].id;
    const otherSellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [otherSellerEmail, hash, "Seller C", "+491700000022", "Hamburg"],
      )
    ).rows[0].id;
    cleanup.userIds.push(sellerId, buyerId, otherSellerId);

    const cat = await pool.query(
      `select id from categories where is_hidden = false order by id asc limit 1`,
    );
    const categoryId = cat.rows[0]?.id;
    if (!categoryId) throw new Error("no category");

    const ad1Id = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Ad One','Desc','Berlin',$2,'S','+491700000023','approved','[]'::jsonb,100,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    const ad2Id = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Ad Two','Desc','Berlin',$2,'S','+491700000024','approved','[]'::jsonb,200,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    const ad3Id = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Ad Three','Desc','Berlin',$2,'S','+491700000025','approved','[]'::jsonb,300,'fixed') returning id`,
        [sellerId, categoryId],
      )
    ).rows[0].id;
    const otherAdId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,'Other Seller Ad','Desc','Hamburg',$2,'C','+491700000026','approved','[]'::jsonb,50,'fixed') returning id`,
        [otherSellerId, categoryId],
      )
    ).rows[0].id;
    cleanup.adIds.push(ad1Id, ad2Id, ad3Id, otherAdId);

    const buyer = await login(buyerEmail, PW);

    // Scenario 1: ad1 → new conversation
    const start1 = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId: ad1Id });
    const convId1 = start1.data.id;
    if (!convId1) throw new Error(`start ad1 failed: ${JSON.stringify(start1.data)}`);
    cleanup.convIds.push(convId1);
    report.scenarios.ad1CreatesConversation = { convId: convId1 };

    const msg1 = await apiPost(`/api/conversations/${convId1}/messages`, buyer.jar, buyer.csrf, {
      body: "استفسار عن الإعلان الأول",
    });
    report.scenarios.firstMessageSent = msg1.res.status === 201;

    // Legacy duplicate rows: same buyer/seller, different ad_id (pre-consolidation)
    const legacyConvId = (
      await pool.query(
        `insert into conversations (ad_id, buyer_id, seller_id, last_message_at)
         values ($1,$2,$3, now() - interval '1 hour') returning id`,
        [ad2Id, buyerId, sellerId],
      )
    ).rows[0].id;
    cleanup.convIds.push(legacyConvId);

    // Scenario 2: ad2 → same conversation (must not 500 on primary ad touch)
    const start2 = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId: ad2Id });
    const convId2 = start2.data.id;
    report.scenarios.legacyDuplicateNo500 =
      start2.res.status === 200 && !String(start2.data.raw ?? "").includes("Internal");
    report.scenarios.ad2ReusesConversation =
      convId2 === convId1 && start2.res.status === 200;
    if (!report.scenarios.ad2ReusesConversation) {
      throw new Error(`expected same conv for ad2, got ${convId2} vs ${convId1}`);
    }

    // Scenario 3: detail has both ads in referencedAds
    const detail = await apiGet(`/api/conversations/${convId1}`, buyer.jar);
    const refs = detail.data.referencedAds ?? [];
    const refIds = refs.map((r) => r.adId).sort((a, b) => a - b);
    report.scenarios.referencedAdsContainsBoth =
      refIds.includes(ad1Id) && refIds.includes(ad2Id);
    report.scenarios.referencedAdsCount = refs.length;

    // Scenario 4: ad3 → same conversation
    const start3 = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId: ad3Id });
    report.scenarios.ad3ReusesConversation = start3.data.id === convId1;

    const detail3 = await apiGet(`/api/conversations/${convId1}`, buyer.jar);
    const refIds3 = (detail3.data.referencedAds ?? []).map((r) => r.adId);
    report.scenarios.referencedAdsContainsThree =
      refIds3.includes(ad1Id) && refIds3.includes(ad2Id) && refIds3.includes(ad3Id);

    // Scenario 5: select ad2 reference message
    const refMsg = await apiPost(`/api/conversations/${convId1}/messages`, buyer.jar, buyer.csrf, {
      referencedAdId: ad2Id,
    });
    const refPayload = refMsg.data.body ? JSON.parse(refMsg.data.body) : null;
    report.scenarios.adReferenceMessage =
      refMsg.res.status === 201 &&
      refMsg.data.messageType === "ad_reference" &&
      refPayload?.adId === ad2Id &&
      refPayload?.title === "Ad Two";
    if (!report.scenarios.adReferenceMessage) {
      throw new Error(`ad reference message failed: ${JSON.stringify(refMsg.data)}`);
    }

    // Scenario 6: inbox shows one row for seller B
    const inbox = await apiGet("/api/conversations", buyer.jar);
    const items = Array.isArray(inbox.data) ? inbox.data : (inbox.data.items ?? []);
    const forSellerB = items.filter((c) => c.otherId === sellerId);
    report.scenarios.inboxOneRowPerSeller = forSellerB.length === 1;
    report.scenarios.inboxSellerBCount = forSellerB.length;

    // Scenario 7: different seller → different conversation
    const startOther = await apiPost("/api/conversations", buyer.jar, buyer.csrf, {
      adId: otherAdId,
    });
    const otherConvId = startOther.data.id;
    if (otherConvId) cleanup.convIds.push(otherConvId);
    report.scenarios.differentSellerDifferentConv =
      otherConvId && otherConvId !== convId1;

    // Scenario 8: messages still present after refresh
    const msgs = await apiGet(`/api/conversations/${convId1}/messages`, buyer.jar);
    const msgItems = Array.isArray(msgs.data) ? msgs.data : (msgs.data.items ?? []);
    report.scenarios.messagesPersistAfterReads = msgItems.length >= 2;
    report.scenarios.messageCount = msgItems.length;

    report.checks.allScenariosPass =
      report.scenarios.legacyDuplicateNo500 &&
      report.scenarios.ad2ReusesConversation &&
      report.scenarios.referencedAdsContainsBoth &&
      report.scenarios.ad3ReusesConversation &&
      report.scenarios.inboxOneRowPerSeller &&
      report.scenarios.differentSellerDifferentConv &&
      report.scenarios.adReferenceMessage &&
      report.scenarios.messagesPersistAfterReads;
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

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok && report.checks.allScenariosPass ? 0 : 1);
}

void main();
