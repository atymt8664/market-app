#!/usr/bin/env node
/**
 * P17-8 Package 3 — STAGING post-shipped completion loop verification.
 * shipped → in_transit → delivered → confirm-receipt → completed
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import "../src/load-env.ts";
import { assertP17OrdersStagingOnly, detectSupabaseProjectRef } from "../src/lib/p17/orders-env-guard.ts";
import { STAGING_SUPABASE_REF } from "../src/lib/jobs/constants.ts";

const BASE = (process.env.TEST_API_BASE || process.env.API_BASE || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const PW = "P17Pkg3Flow99!z";

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
  console.log("=== P17-8 Package 3 STAGING post-ship flow ===\n");

  try {
    assertP17OrdersStagingOnly();
    if (detectSupabaseProjectRef() === STAGING_SUPABASE_REF) ok("env guard STAGING");
    else bad("env guard");
  } catch (err) {
    bad(`env: ${err instanceof Error ? err.message : err}`);
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
  const sellerEmail = `p17-pkg3-seller-${ts}@example.invalid`;
  const buyerEmail = `p17-pkg3-buyer-${ts}@example.invalid`;
  const hash = await bcrypt.hash(PW, 10);
  let orderNumber;
  let orderId;

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
        [sellerEmail, hash, "Pkg3 Seller", "+491700000050", "Berlin"],
      )
    ).rows[0].id;

    const buyerId = (
      await pool.query(
        `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
         values ($1,$2,$3,$4,$5,true,false) returning id`,
        [buyerEmail, hash, "Pkg3 Buyer", "+491700000051", "Munich"],
      )
    ).rows[0].id;

    const adId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [
          sellerId,
          `P17-8 Pkg3 Test ${ts}`,
          "post-ship loop",
          "Berlin",
          categoryId,
          "Pkg3 Seller",
          "+491700000050",
          "99.00",
        ],
      )
    ).rows[0].id;

    const buyer = await login(buyerEmail, PW);
    const seller = await login(sellerEmail, PW);

    const create = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId,
      fulfillmentMode: "shipping",
      currency: "EUR",
      shippingAmount: "5.00",
      buyerAddress: {
        recipientName: "Buyer Test",
        phone: "+491700000051",
        city: "Munich",
        countryCode: "DE",
        postalCode: "80331",
        line1: "Teststrasse 12",
        line2: "Wohnung 2",
      },
    });
    if (!create.res.ok || create.body.mock) bad(`create order HTTP ${create.res.status}`);
    else {
      orderNumber = create.body.order?.orderNumber;
      ok(`create shipping order ${orderNumber}`);
    }

    if (!orderNumber) {
      await pool.end();
      process.exit(1);
    }

    await apiPost(`/api/orders/${encodeURIComponent(orderNumber)}/accept`, seller.jar, seller.csrf);
    await apiPost(`/api/orders/${encodeURIComponent(orderNumber)}/start-preparing`, seller.jar, seller.csrf);
    await apiPost(`/api/orders/${encodeURIComponent(orderNumber)}/mark-shipped`, seller.jar, seller.csrf, {
      carrierLabel: "DHL",
      trackingNumber: `PKG3-${ts}`,
    });

    const inTransit = await apiPost(
      `/api/orders/${encodeURIComponent(orderNumber)}/mark-in-transit`,
      seller.jar,
      seller.csrf,
    );
    if (inTransit.res.ok && inTransit.body.order?.status === "in_transit") {
      ok("mark-in-transit → in_transit");
    } else bad(`mark-in-transit HTTP ${inTransit.res.status}`);

    const buyerCantDeliver = await apiPost(
      `/api/orders/${encodeURIComponent(orderNumber)}/mark-delivered`,
      buyer.jar,
      buyer.csrf,
    );
    if (buyerCantDeliver.res.status === 403) ok("buyer cannot mark-delivered (403)");
    else bad(`buyer mark-delivered should 403 got ${buyerCantDeliver.res.status}`);

    const delivered = await apiPost(
      `/api/orders/${encodeURIComponent(orderNumber)}/mark-delivered`,
      seller.jar,
      seller.csrf,
    );
    if (delivered.res.ok && delivered.body.order?.status === "delivered") {
      ok("mark-delivered → delivered");
    } else bad(`mark-delivered HTTP ${delivered.res.status}`);

    const sellerCantConfirm = await apiPost(
      `/api/orders/${encodeURIComponent(orderNumber)}/confirm-receipt`,
      seller.jar,
      seller.csrf,
    );
    if (sellerCantConfirm.res.status === 403) ok("seller cannot confirm-receipt (403)");
    else bad(`seller confirm-receipt should 403 got ${sellerCantConfirm.res.status}`);

    const confirm = await apiPost(
      `/api/orders/${encodeURIComponent(orderNumber)}/confirm-receipt`,
      buyer.jar,
      buyer.csrf,
    );
    if (confirm.res.ok && confirm.body.order?.status === "completed") {
      ok("confirm-receipt → completed");
    } else bad(`confirm-receipt HTTP ${confirm.res.status} status=${confirm.body.order?.status}`);

    const illegal = await apiPost(
      `/api/orders/${encodeURIComponent(orderNumber)}/mark-in-transit`,
      seller.jar,
      seller.csrf,
    );
    if (illegal.res.status === 409) ok("completed order rejects mark-in-transit (409)");
    else bad(`completed mark-in-transit should 409 got ${illegal.res.status}`);

    const orderRow = await pool.query(
      `select id, status, completed_at is not null as has_completed from orders where order_number = $1`,
      [orderNumber],
    );
    orderId = orderRow.rows[0]?.id;
    if (orderRow.rows[0]?.status === "completed" && orderRow.rows[0]?.has_completed) {
      ok("DB orders.status=completed with completed_at");
    } else bad("DB order not completed");

    const shipRow = await pool.query(
      `select delivered_at is not null as has_delivered from shipments s
       join orders o on o.id = s.order_id where o.order_number = $1`,
      [orderNumber],
    );
    if (shipRow.rows[0]?.has_delivered) ok("DB shipments.delivered_at set");
    else bad("DB shipments.delivered_at missing");

    const hist = await pool.query(
      `select count(*)::int as c from order_status_history h
       join orders o on o.id = h.order_id where o.order_number = $1`,
      [orderNumber],
    );
    if ((hist.rows[0]?.c ?? 0) >= 8) ok(`order_status_history rows=${hist.rows[0]?.c}`);
    else bad(`order_status_history too few: ${hist.rows[0]?.c}`);

    const timeline = await apiGet(`/api/orders/${encodeURIComponent(orderNumber)}/timeline`, buyer.jar);
    if (timeline.res.ok && Array.isArray(timeline.body.items) && timeline.body.items.length >= 6) {
      ok(`timeline items=${timeline.body.items.length}`);
    } else bad("timeline missing events");
  } finally {
    if (orderId) {
      await pool.query("delete from orders where id = $1", [orderId]).catch(() => {});
    }
    await pool.end();
  }

  if (fail === 0) {
    console.log("\n=== P17-8 PKG3 STAGING FLOW: PASS ===");
    process.exit(0);
  }
  console.log("\n=== P17-8 PKG3 STAGING FLOW: FAIL ===");
  process.exit(1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
