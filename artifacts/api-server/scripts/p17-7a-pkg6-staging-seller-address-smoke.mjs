#!/usr/bin/env node
/**
 * P17-7A Package 6 — STAGING seller delivery address on shipping order detail.
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import "../src/load-env.ts";
import { assertP17OrdersStagingOnly } from "../src/lib/p17/orders-env-guard.ts";

const BASE = (process.env.TEST_API_BASE || process.env.API_BASE || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const PW = "P17_7A_Pkg6_99!x";
const ADDRESS = {
  recipientName: "محمد أحمد",
  phone: "+4915123456789",
  countryCode: "DE",
  city: "Leipzig",
  postalCode: "04109",
  line1: "Musterstraße 12",
  line2: "Wohnung 3",
};

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
  if (!res.ok) throw new Error(`login HTTP ${res.status}`);
  grabCookie(res, jar);
  const data = await res.json();
  return { jar, csrf: data.csrfToken };
}

async function apiPost(path, jar, csrf, json) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie: jar.cookie, "content-type": "application/json", "x-csrf-token": csrf },
    body: JSON.stringify(json ?? {}),
  });
  return { res, body: await res.json().catch(() => ({})) };
}

async function apiGet(path, jar) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie: jar.cookie } });
  return { res, body: await res.json().catch(() => ({})) };
}

async function main() {
  console.log("=== P17-7A Package 6 STAGING seller address smoke ===\n");
  assertP17OrdersStagingOnly();
  ok("env guard STAGING");

  const hz = await fetch(`${BASE}/api/healthz`);
  if (!hz.ok) {
    bad("API unreachable");
    process.exit(1);
  }
  ok(`API healthz (${BASE})`);

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.toLowerCase().includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const ts = Date.now();
  const hash = await bcrypt.hash(PW, 10);

  try {
    const categoryId = (
      await pool.query(`select id from categories where is_hidden = false limit 1`)
    ).rows[0]?.id;
    const sellerEmail = `pkg6-s-${ts}@example.invalid`;
    const buyerEmail = `pkg6-b-${ts}@example.invalid`;

    const sellerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [sellerEmail, hash, "Pkg6 Seller", "+491700000080", "Berlin"],
      )
    ).rows[0].id;

    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1,$2,$3,$4,$5,true,false)`,
      [buyerEmail, hash, "Pkg6 Buyer", "+491700000081", "Munich"],
    );

    const shipAd = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [sellerId, "pkg6 ship", "x", "Berlin", categoryId, "S", "+491700000080", "50.00"],
      )
    ).rows[0].id;

    const pickupAd = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [sellerId, "pkg6 pickup", "x", "Berlin", categoryId, "S", "+491700000080", "30.00"],
      )
    ).rows[0].id;

    const buyer = await login(buyerEmail, PW);
    const seller = await login(sellerEmail, PW);

    const shipCreate = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: shipAd,
      fulfillmentMode: "shipping",
      currency: "EUR",
      buyerAddress: ADDRESS,
      idempotencyKey: `pkg6-ship-${ts}`,
    });
    const shipNum = shipCreate.body.order?.orderNumber;
    if (!shipCreate.res.ok || !shipNum) bad("shipping create failed");
    else ok(`shipping order ${shipNum}`);

    if (shipNum) {
      const detail = await apiGet(`/api/orders/${encodeURIComponent(shipNum)}`, seller.jar);
      const ba = detail.body.order?.buyerAddress;
      if (
        detail.body.order?.fulfillmentMode === "shipping" &&
        ba?.recipientName === ADDRESS.recipientName &&
        ba?.phone === ADDRESS.phone &&
        ba?.countryCode === ADDRESS.countryCode &&
        ba?.city === ADDRESS.city &&
        ba?.postalCode === ADDRESS.postalCode &&
        ba?.line1 === ADDRESS.line1 &&
        ba?.line2 === ADDRESS.line2
      ) {
        ok("seller shipping detail — full buyerAddress (7 fields)");
      } else {
        bad("seller shipping address incomplete");
      }
    }

    const pickupCreate = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: pickupAd,
      fulfillmentMode: "pickup",
      currency: "EUR",
      idempotencyKey: `pkg6-pickup-${ts}`,
    });
    const pickupNum = pickupCreate.body.order?.orderNumber;
    if (!pickupCreate.res.ok || !pickupNum) bad("pickup create failed");
    else ok(`pickup order ${pickupNum}`);

    if (pickupNum) {
      const detail = await apiGet(`/api/orders/${encodeURIComponent(pickupNum)}`, seller.jar);
      if (detail.body.order?.fulfillmentMode === "pickup" && !detail.body.order?.buyerAddress) {
        ok("pickup order — no buyerAddress (card gated off)");
      } else {
        bad("pickup must not expose buyerAddress");
      }
    }
  } finally {
    await pool.end();
  }

  if (fail === 0) {
    console.log("\n=== P17-7A PACKAGE 6 STAGING SMOKE: PASS ===");
    process.exit(0);
  }
  console.log("\n=== P17-7A PACKAGE 6 STAGING SMOKE: FAIL ===");
  process.exit(1);
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
