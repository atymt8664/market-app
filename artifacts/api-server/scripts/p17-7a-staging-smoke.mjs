#!/usr/bin/env node
/**
 * P17-7A Package 7 — STAGING API smoke (core §11 scenarios).
 * T1, T2, T3, T4, T5, T13, T14, T15, T16. STAGING ref only.
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import "../src/load-env.ts";
import { assertP17OrdersStagingOnly } from "../src/lib/p17/orders-env-guard.ts";

const BASE = (process.env.TEST_API_BASE || process.env.API_BASE || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);
const PW = "P17_7A_Pkg3_99!x";

const VALID_ADDRESS = {
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
  console.log("=== P17-7A STAGING smoke (core API) ===\n");

  try {
    assertP17OrdersStagingOnly();
    ok("env guard STAGING + P17_ORDERS_API_ENABLED");
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
  const sellerEmail = `p17-7a-pkg3-seller-${ts}@example.invalid`;
  const buyerEmail = `p17-7a-pkg3-buyer-${ts}@example.invalid`;
  const strangerEmail = `p17-7a-pkg3-stranger-${ts}@example.invalid`;
  const hash = await bcrypt.hash(PW, 10);

  let shippingAdId;
  let pickupAdId;
  let shippingOrderNumber;

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

    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1,$2,$3,$4,$5,true,false)`,
      [buyerEmail, hash, "Pkg3 Buyer", "+491700000051", "Munich"],
    );

    await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1,$2,$3,$4,$5,true,false)`,
      [strangerEmail, hash, "Pkg3 Stranger", "+491700000052", "Hamburg"],
    );

    shippingAdId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [
          sellerId,
          `P17-7A pkg3 shipping ${ts}`,
          "pkg3 shipping",
          "Berlin",
          categoryId,
          "Pkg3 Seller",
          "+491700000050",
          "55.00",
        ],
      )
    ).rows[0].id;

    pickupAdId = (
      await pool.query(
        `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images, price, price_type)
         values ($1,$2,$3,$4,$5,$6,$7,'approved','[]'::jsonb,$8,'fixed') returning id`,
        [
          sellerId,
          `P17-7A pkg3 pickup ${ts}`,
          "pkg3 pickup",
          "Berlin",
          categoryId,
          "Pkg3 Seller",
          "+491700000050",
          "33.00",
        ],
      )
    ).rows[0].id;

    const buyer = await login(buyerEmail, PW);
    const seller = await login(sellerEmail, PW);
    const stranger = await login(strangerEmail, PW);

    // T2 — shipping without address → 400 VALIDATION, no order
    const t2 = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: shippingAdId,
      fulfillmentMode: "shipping",
      currency: "EUR",
      idempotencyKey: `p17-7a-t2-${ts}`,
    });
    if (t2.res.status === 400 && t2.body.code === "ORDER_VALIDATION") {
      ok("T2 shipping without address → 400 ORDER_VALIDATION");
    } else {
      bad(`T2 expected 400 ORDER_VALIDATION got ${t2.res.status} code=${t2.body.code}`);
    }

    // T2b — incomplete address (missing line2)
    const t2b = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: shippingAdId,
      fulfillmentMode: "shipping",
      currency: "EUR",
      buyerAddress: { ...VALID_ADDRESS, line2: "" },
      idempotencyKey: `p17-7a-t2b-${ts}`,
    });
    if (t2b.res.status === 400 && t2b.body.code === "ORDER_VALIDATION") {
      ok("T2b incomplete address (empty line2) → 400 ORDER_VALIDATION");
    } else {
      bad(`T2b expected 400 ORDER_VALIDATION got ${t2b.res.status}`);
    }

    // T1 — shipping with full address → 201 + DB row
    const t1 = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: shippingAdId,
      fulfillmentMode: "shipping",
      currency: "EUR",
      shippingAmount: "0.00",
      buyerAddress: VALID_ADDRESS,
      idempotencyKey: `p17-7a-t1-${ts}`,
    });
    if (t1.res.status === 201 && t1.body.mock === false && t1.body.order?.orderNumber) {
      shippingOrderNumber = t1.body.order.orderNumber;
      ok(`T1 shipping create → ${shippingOrderNumber}`);
    } else {
      bad(`T1 create failed HTTP ${t1.res.status} code=${t1.body.code}`);
    }

    if (shippingOrderNumber) {
      const addrRow = await pool.query(
        `select recipient_name, phone, postal_code, line2
         from buyer_addresses ba
         join orders o on o.id = ba.order_id
         where o.order_number = $1`,
        [shippingOrderNumber],
      );
      const row = addrRow.rows[0];
      if (
        row?.recipient_name === VALID_ADDRESS.recipientName &&
        row?.phone === VALID_ADDRESS.phone &&
        row?.postal_code === VALID_ADDRESS.postalCode &&
        row?.line2 === VALID_ADDRESS.line2
      ) {
        ok("T1 buyer_addresses snapshot persisted");
      } else {
        bad("T1 buyer_addresses row incomplete");
      }
    }

    // T4 — duplicate active order on same ad → 409 ORDER_DUPLICATE_ACTIVE
    const t4 = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: shippingAdId,
      fulfillmentMode: "shipping",
      currency: "EUR",
      buyerAddress: VALID_ADDRESS,
      idempotencyKey: `p17-7a-t4-${ts}`,
    });
    if (t4.res.status === 409 && t4.body.code === "ORDER_DUPLICATE_ACTIVE") {
      ok("T4 duplicate active order → 409 ORDER_DUPLICATE_ACTIVE");
    } else {
      bad(`T4 expected 409 ORDER_DUPLICATE_ACTIVE got ${t4.res.status} code=${t4.body.code}`);
    }

    // T5 — same Idempotency-Key → single order row
    const idemKey = `p17-7a-t5-${ts}`;
    const t5a = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: pickupAdId,
      fulfillmentMode: "pickup",
      currency: "EUR",
      idempotencyKey: idemKey,
    });
    const t5b = await apiPost("/api/orders", buyer.jar, buyer.csrf, {
      adId: pickupAdId,
      fulfillmentMode: "pickup",
      currency: "EUR",
      idempotencyKey: idemKey,
    });
    const t5Num = t5a.body.order?.orderNumber;
    if (
      t5a.res.status === 201 &&
      t5b.res.status === 201 &&
      t5Num &&
      t5b.body.order?.orderNumber === t5Num
    ) {
      ok(`T5 idempotency double POST → single order ${t5Num}`);
    } else {
      bad(`T5 idempotency mismatch (${t5a.res.status}/${t5b.res.status})`);
    }

    // T15 — buyer cannot POST accept
    if (shippingOrderNumber) {
      const t15 = await apiPost(
        `/api/orders/${encodeURIComponent(shippingOrderNumber)}/accept`,
        buyer.jar,
        buyer.csrf,
      );
      if (t15.res.status === 403 && t15.body.code === "ORDER_FORBIDDEN") {
        ok("T15 buyer POST accept → 403 ORDER_FORBIDDEN");
      } else {
        bad(`T15 expected 403 ORDER_FORBIDDEN got ${t15.res.status} code=${t15.body.code}`);
      }
    }

    // T13 — seller detail includes phone + line2 + recipientName
    if (shippingOrderNumber) {
      const t13 = await apiGet(`/api/orders/${encodeURIComponent(shippingOrderNumber)}`, seller.jar);
      const ba = t13.body.order?.buyerAddress;
      if (
        t13.res.ok &&
        ba?.phone === VALID_ADDRESS.phone &&
        ba?.line2 === VALID_ADDRESS.line2 &&
        ba?.recipientName === VALID_ADDRESS.recipientName &&
        ba?.postalCode === VALID_ADDRESS.postalCode &&
        ba?.line1 === VALID_ADDRESS.line1
      ) {
        ok("T13 seller detail full buyerAddress (phone, line2, recipient)");
      } else {
        bad("T13 seller detail missing address fields");
      }
    }

    // T14 — cross-user access → 403
    if (shippingOrderNumber) {
      const t14 = await apiGet(`/api/orders/${encodeURIComponent(shippingOrderNumber)}`, stranger.jar);
      if (t14.res.status === 403 && t14.body.code === "ORDER_FORBIDDEN") {
        ok("T14 cross-user detail → 403 ORDER_FORBIDDEN");
      } else {
        bad(`T14 expected 403 got ${t14.res.status}`);
      }
    }

    // T16 — pickup without address (T5 already created pickup on pickupAdId; verify no address row)
    if (t5Num) {
      ok("T16 pickup create without address → 201 (via T5 idempotency)");
      const noAddrRow = await pool.query(
        `select count(*)::int as c from buyer_addresses ba
         join orders o on o.id = ba.order_id where o.order_number = $1`,
        [t5Num],
      );
      if ((noAddrRow.rows[0]?.c ?? 1) === 0) {
        ok("T3/T16 pickup — no buyer_addresses row");
      } else {
        bad("T16 pickup order has unexpected buyer_addresses row");
      }
    } else {
      bad("T16 pickup order missing from T5");
    }
  } finally {
    await pool.end();
  }

  if (fail === 0) {
    console.log("\n=== P17-7A STAGING SMOKE (core API): PASS ===");
    process.exit(0);
  }
  console.log("\n=== P17-7A STAGING SMOKE (core API): FAIL ===");
  process.exit(1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
