#!/usr/bin/env node
/**
 * P17-7A Package 4 — STAGING chat smoke: reuse conversation + seller list access.
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import "../src/load-env.ts";
import { assertP17OrdersStagingOnly } from "../src/lib/p17/orders-env-guard.ts";

const BASE = (process.env.TEST_API_BASE || process.env.API_BASE || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const PW = "P17_7A_Pkg4Chat99!";

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

async function main() {
  console.log("=== P17-7A Package 4 STAGING chat smoke ===\n");

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
  const sellerEmail = `p17-7a-pkg4-seller-${ts}@example.invalid`;
  const buyerEmail = `p17-7a-pkg4-buyer-${ts}@example.invalid`;
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
        [sellerEmail, hash, "Pkg4 Seller", "+491700000060", "Berlin"],
      )
    ).rows[0].id;

    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1,$2,$3,$4,$5,true,false)`,
      [buyerEmail, hash, "Pkg4 Buyer", "+491700000061", "Munich"],
    );

    const adId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [
          sellerId,
          `P17-7A pkg4 chat ${ts}`,
          "pkg4 chat",
          "Berlin",
          categoryId,
          "Pkg4 Seller",
          "+491700000060",
          "44.00",
        ],
      )
    ).rows[0].id;

    const buyer = await login(buyerEmail, PW);
    const seller = await login(sellerEmail, PW);

    const first = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId });
    if (!first.res.ok || !first.body.id) {
      bad(`buyer start conversation HTTP ${first.res.status}`);
    } else {
      ok(`buyer start conversation → id=${first.body.id}`);
    }

    const second = await apiPost("/api/conversations", buyer.jar, buyer.csrf, { adId });
    if (second.res.ok && second.body.id === first.body.id) {
      ok("buyer re-open same ad → same conversation id");
    } else {
      bad(`conversation reuse mismatch (${second.body.id} vs ${first.body.id})`);
    }

    const sellerOwnAd = await apiPost("/api/conversations", seller.jar, seller.csrf, { adId });
    if (sellerOwnAd.res.status === 400) {
      ok("seller cannot startConversation on own ad (expected)");
    } else {
      bad(`seller own-ad start expected 400 got ${sellerOwnAd.res.status}`);
    }

    const sellerList = await apiGet("/api/conversations", seller.jar);
    const items = Array.isArray(sellerList.body) ? sellerList.body : sellerList.body.items;
    const found = Array.isArray(items) ? items.find((c) => c.adId === adId) : null;
    if (sellerList.res.ok && found?.id === first.body.id) {
      ok("seller lists existing buyer conversation for ad");
    } else {
      bad("seller conversation list missing ad thread");
    }
  } finally {
    await pool.end();
  }

  if (fail === 0) {
    console.log("\n=== P17-7A PACKAGE 4 STAGING CHAT SMOKE: PASS ===");
    process.exit(0);
  }
  console.log("\n=== P17-7A PACKAGE 4 STAGING CHAT SMOKE: FAIL ===");
  process.exit(1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
