/**
 * P17-PRELAUNCH-2 — Production E2E (no Playwright).
 * Run on VPS: docker exec -e DATABASE_URL=... souq-arab-api-api-1 node p17-prelaunch-2-prod-e2e.mjs
 * Creates seller + buyer via signup API, verifies via DB, ad + order + list field checks.
 */
const API = (process.env.PROD_API_BASE || "https://api.souq-arab.com").replace(/\/$/, "");
const TS = Date.now();
const PASSWORD = "P17Pre2!Aa9";
const SELLER_EMAIL = `p17pre2.seller.${TS}@souq-arab-e2e.local`;
const BUYER_EMAIL = `p17pre2.buyer.${TS}@souq-arab-e2e.local`;

const signupBody = (email, firstName) => ({
  firstName,
  lastName: "Prelaunch2",
  email,
  country: "Germany",
  countryCode: "DE",
  phoneCountryCode: "+49",
  phoneNumber: "1512345678",
  city: "Berlin",
  password: PASSWORD,
  confirmPassword: PASSWORD,
  acceptTerms: true,
  acceptPrivacy: true,
});

async function fetchJson(path, init = {}) {
  const res = await fetch(`${API}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function cookieHeader(setCookies) {
  return (setCookies ?? [])
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function signup(email, firstName) {
  const { res, body } = await fetchJson("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(signupBody(email, firstName)),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`signup ${email} HTTP ${res.status}`);
  }
  return body;
}

async function verifyViaDb(email) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(
    `UPDATE users SET email_verified = true, verification_code = NULL, verification_expires_at = NULL WHERE email = $1`,
    [email.toLowerCase()],
  );
  await client.end();
}

async function login(email) {
  const { res, body } = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const cookie = cookieHeader(cookies);
  if (!res.ok || !cookie || !body.csrfToken) {
    throw new Error(`login ${email} HTTP ${res.status}`);
  }
  return { cookie, csrf: body.csrfToken, userId: body.id };
}

async function sampleAdImage(client) {
  const { rows } = await client.query(`
    SELECT images FROM ads
    WHERE status = 'approved' AND jsonb_array_length(images::jsonb) > 0
    ORDER BY id DESC LIMIT 1
  `);
  const images = rows[0]?.images;
  if (Array.isArray(images) && typeof images[0] === "string" && images[0].trim()) {
    return images[0].trim();
  }
  if (Array.isArray(images) && images[0]?.url) return String(images[0].url).trim();
  return "https://www.souq-arab.com/brand/logo-master.png";
}

async function createAd(session) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const imageUrl = await sampleAdImage(client);
  await client.end();

  const { res, body } = await fetchJson("/api/ads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
      "x-csrf-token": session.csrf,
    },
    body: JSON.stringify({
      title: `P17-PRELAUNCH-2 E2E ${TS}`,
      description: "Production verification ad — safe to delete.",
      price: 12.5,
      priceType: "fixed",
      type: "product",
      city: "Berlin",
      categoryId: 1,
      sellerName: "P17 Seller",
      sellerPhone: "+491512345678",
      images: [imageUrl],
    }),
  });
  if (!res.ok || !body?.id) throw new Error(`create ad HTTP ${res.status}`);
  return body.id;
}

async function approveAd(adId) {
  const url = process.env.DATABASE_URL;
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(`UPDATE ads SET status = 'approved' WHERE id = $1`, [adId]);
  await client.end();
}

async function createOrder(buyer, adId) {
  const { res, body } = await fetchJson("/api/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: buyer.cookie,
      "x-csrf-token": buyer.csrf,
      "Idempotency-Key": `p17pre2-${TS}-${adId}`,
    },
    body: JSON.stringify({
      adId,
      fulfillmentMode: "pickup",
      currency: "EUR",
    }),
  });
  if (!res.ok || !body?.order?.orderNumber) throw new Error(`create order HTTP ${res.status}`);
  return body.order.orderNumber;
}

async function assertList(path, session, label) {
  const { res, body } = await fetchJson(path, { headers: { cookie: session.cookie } });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  if (body.mock === true) throw new Error(`${label} mock:true`);
  const item = body.items?.find((o) => String(o.orderNumber).includes("SOUQ-")) ?? body.items?.[0];
  if (!item) throw new Error(`${label} empty list`);
  const adId = Number(item.adId) || 0;
  const hasImage = typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0;
  console.log(
    `OK ${label} order=${item.orderNumber} adId=${adId || "none"} imageUrl=${hasImage ? "yes" : "no"}`,
  );
  if (!hasImage && adId <= 0) throw new Error(`${label} missing thumbnail fields`);
  return item;
}

try {
  console.log("=== P17-PRELAUNCH-2 prod E2E start ===");
  await signup(SELLER_EMAIL, "Seller");
  await signup(BUYER_EMAIL, "Buyer");
  await verifyViaDb(SELLER_EMAIL);
  await verifyViaDb(BUYER_EMAIL);

  const seller = await login(SELLER_EMAIL);
  const buyer = await login(BUYER_EMAIL);
  const adId = await createAd(seller);
  await approveAd(adId);
  const orderNumber = await createOrder(buyer, adId);

  await assertList("/api/orders", buyer, "buyer list");
  await assertList("/api/orders/seller", seller, "seller list");

  console.log("ACCOUNTS seller=" + SELLER_EMAIL + " buyer=" + BUYER_EMAIL + " password=" + PASSWORD);
  console.log("ORDER " + orderNumber + " adId=" + adId);
  console.log("URLS /orders /seller-orders /orders/" + orderNumber);
  console.log("=== P17-PRELAUNCH-2 prod E2E PASS ===");
} catch (err) {
  console.log("FAIL " + (err instanceof Error ? err.message : err));
  process.exit(1);
}
