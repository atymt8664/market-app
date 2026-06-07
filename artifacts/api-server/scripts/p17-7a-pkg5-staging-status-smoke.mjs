#!/usr/bin/env node
/**
 * P17-7A Package 5 — STAGING buyer status labels (reject vs cancel + confirmed).
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import "../src/load-env.ts";
import { assertP17OrdersStagingOnly } from "../src/lib/p17/orders-env-guard.ts";

const BASE = (process.env.TEST_API_BASE || process.env.API_BASE || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const PW = "P17_7A_Pkg5_99!x";

let fail = 0;
const ok = (msg) => console.log(`  OK  ${msg}`);
const bad = (msg) => {
  console.log(`  FAIL ${msg}`);
  fail = 1;
};

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
  if (!res.ok) throw new Error(`login ${email} HTTP ${res.status}`);
  grabCookie(res, jar);
  const data = await res.json();
  if (!jar.cookie) throw new Error(`login ${email}: no session`);
  return { jar, csrf: data.csrfToken };
}

async function apiPost(path, jar, csrf, json) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      cookie: jar.cookie,
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(json ?? {}),
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function apiGet(path, jar) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie: jar.cookie } });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function createPickupOrder(buyer, sellerAdId, key) {
  return apiPost("/api/orders", buyer.jar, buyer.csrf, {
    adId: sellerAdId,
    fulfillmentMode: "pickup",
    currency: "EUR",
    idempotencyKey: key,
  });
}

async function main() {
  console.log("=== P17-7A Package 5 STAGING status smoke ===\n");

  try {
    assertP17OrdersStagingOnly();
    ok("env guard STAGING");
  } catch (err) {
    bad(`env guard: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const hz = await fetch(`${BASE}/api/healthz`);
  if (!hz.ok) {
    bad(`API unreachable at ${BASE}`);
    process.exit(1);
  }
  ok(`API healthz (${BASE})`);

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    bad("DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.toLowerCase().includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const ts = Date.now();
  const sellerEmail = `p17-7a-pkg5-seller-${ts}@example.invalid`;
  const buyerEmail = `p17-7a-pkg5-buyer-${ts}@example.invalid`;
  const hash = await bcrypt.hash(PW, 10);

  try {
    const cat = await pool.query(
      `select id from categories where is_hidden = false order by id asc limit 1`,
    );
    const categoryId = cat.rows[0]?.id;
    if (!categoryId) throw new Error("no category");

    const sellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [sellerEmail, hash, "Pkg5 Seller", "+491700000070", "Berlin"],
      )
    ).rows[0].id;

    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1,$2,$3,$4,$5,true,false)`,
      [buyerEmail, hash, "Pkg5 Buyer", "+491700000071", "Munich"],
    );

    const adReject = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [sellerId, `Pkg5 reject ${ts}`, "x", "Berlin", categoryId, "S", "+491700000070", "40.00"],
      )
    ).rows[0].id;

    const adCancel = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [sellerId, `Pkg5 cancel ${ts}`, "x", "Berlin", categoryId, "S", "+491700000070", "41.00"],
      )
    ).rows[0].id;

    const adAccept = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [sellerId, `Pkg5 accept ${ts}`, "x", "Berlin", categoryId, "S", "+491700000070", "42.00"],
      )
    ).rows[0].id;

    const buyer = await login(buyerEmail, PW);
    const seller = await login(sellerEmail, PW);

    const rejectCreate = await createPickupOrder(buyer, adReject, `pkg5-reject-${ts}`);
    const rejectNum = rejectCreate.body.order?.orderNumber;
    if (!rejectCreate.res.ok || !rejectNum) bad("reject flow create failed");
    else ok(`reject flow order ${rejectNum}`);

    if (rejectNum) {
      const rejectRes = await apiPost(
        `/api/orders/${encodeURIComponent(rejectNum)}/reject`,
        seller.jar,
        seller.csrf,
      );
      if (!rejectRes.res.ok) bad(`seller reject HTTP ${rejectRes.res.status}`);
      const buyerDetail = await apiGet(`/api/orders/${encodeURIComponent(rejectNum)}`, buyer.jar);
      if (
        buyerDetail.body.order?.status === "cancelled" &&
        buyerDetail.body.order?.statusLabelAr === "تم رفض الطلب من البائع"
      ) {
        ok("buyer detail → seller rejected label");
      } else {
        bad(`buyer reject label got "${buyerDetail.body.order?.statusLabelAr}"`);
      }
    }

    const cancelCreate = await createPickupOrder(buyer, adCancel, `pkg5-cancel-${ts}`);
    const cancelNum = cancelCreate.body.order?.orderNumber;
    if (!cancelCreate.res.ok || !cancelNum) bad("cancel flow create failed");
    else ok(`cancel flow order ${cancelNum}`);

    if (cancelNum) {
      const cancelRes = await apiPost(
        `/api/orders/${encodeURIComponent(cancelNum)}/cancel`,
        buyer.jar,
        buyer.csrf,
      );
      if (!cancelRes.res.ok) bad(`buyer cancel HTTP ${cancelRes.res.status}`);
      const buyerDetail = await apiGet(`/api/orders/${encodeURIComponent(cancelNum)}`, buyer.jar);
      if (
        buyerDetail.body.order?.status === "cancelled" &&
        buyerDetail.body.order?.statusLabelAr === "تم إلغاء الطلب"
      ) {
        ok("buyer detail → buyer cancelled label");
      } else {
        bad(`buyer cancel label got "${buyerDetail.body.order?.statusLabelAr}"`);
      }
    }

    const acceptCreate = await createPickupOrder(buyer, adAccept, `pkg5-accept-${ts}`);
    const acceptNum = acceptCreate.body.order?.orderNumber;
    if (!acceptCreate.res.ok || !acceptNum) bad("accept flow create failed");
    else ok(`accept flow order ${acceptNum}`);

    if (acceptNum) {
      const pending = await apiGet(`/api/orders/${encodeURIComponent(acceptNum)}`, buyer.jar);
      if (pending.body.order?.statusLabelAr === "بانتظار تأكيد البائع") {
        ok("pending_confirmation label");
      } else {
        bad(`pending label got "${pending.body.order?.statusLabelAr}"`);
      }

      const acceptRes = await apiPost(
        `/api/orders/${encodeURIComponent(acceptNum)}/accept`,
        seller.jar,
        seller.csrf,
      );
      if (!acceptRes.res.ok) bad(`seller accept HTTP ${acceptRes.res.status}`);
      const confirmed = await apiGet(`/api/orders/${encodeURIComponent(acceptNum)}`, buyer.jar);
      if (
        confirmed.body.order?.status === "confirmed" &&
        confirmed.body.order?.statusLabelAr === "تم تأكيد الطلب من البائع"
      ) {
        ok("confirmed label after seller accept");
      } else {
        bad(`confirmed label got "${confirmed.body.order?.statusLabelAr}"`);
      }
    }
  } finally {
    await pool.end();
  }

  if (fail === 0) {
    console.log("\n=== P17-7A PACKAGE 5 STAGING STATUS SMOKE: PASS ===");
    process.exit(0);
  }
  console.log("\n=== P17-7A PACKAGE 5 STAGING STATUS SMOKE: FAIL ===");
  process.exit(1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
