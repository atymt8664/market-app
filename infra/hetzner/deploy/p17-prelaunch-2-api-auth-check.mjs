/**
 * Authenticated GET /api/orders + /api/orders/seller field check.
 * Env: PROD_TEST_* or STAGING_SMOKE_* or PROD_SMOKE_* (never logged).
 */
const API = (process.env.PROD_API_BASE || "https://api.souq-arab.com").replace(/\/$/, "");

const buyerEmail =
  process.env.PROD_TEST_BUYER_EMAIL?.trim() ||
  process.env.PROD_SMOKE_EMAIL?.trim() ||
  process.env.STAGING_SMOKE_EMAIL?.trim();
const buyerPw =
  process.env.PROD_TEST_BUYER_PASSWORD?.trim() ||
  process.env.PROD_SMOKE_PASSWORD?.trim() ||
  process.env.STAGING_SMOKE_PASSWORD?.trim();
const sellerEmail = process.env.PROD_TEST_SELLER_EMAIL?.trim() || buyerEmail;
const sellerPw = process.env.PROD_TEST_SELLER_PASSWORD?.trim() || buyerPw;

if (!buyerEmail || !buyerPw) {
  console.log("FAIL no buyer credentials in env");
  process.exit(1);
}

async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = res.headers.getSetCookie?.() ?? [];
  const sid = cookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("souq.sid="));
  if (!res.ok || !sid) throw new Error(`login HTTP ${res.status}`);
  return { cookie: sid, csrf: body.csrfToken };
}

async function getOrders(path, session) {
  const res = await fetch(`${API}${path}`, { headers: { cookie: session.cookie } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return body;
}

function assertList(label, body) {
  if (body.mock === true) {
    console.log(`FAIL ${label} mock:true (DB provider off)`);
    process.exit(1);
  }
  const item = body.items?.[0];
  if (!item) {
    console.log(`WARN ${label} empty list`);
    return;
  }
  const hasAdId = typeof item.adId === "number" && item.adId > 0;
  const hasImage = typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0;
  console.log(
    `OK ${label} mock:false adId=${item.adId ?? "none"} imageUrl=${hasImage ? "yes" : "no"}`,
  );
  if (!hasAdId && !hasImage) {
    console.log(`FAIL ${label} missing adId and imageUrl`);
    process.exit(1);
  }
}

try {
  const buyer = await login(buyerEmail, buyerPw);
  assertList("GET /api/orders", await getOrders("/api/orders", buyer));
  if (sellerEmail && sellerPw) {
    const seller = await login(sellerEmail, sellerPw);
    assertList("GET /api/orders/seller", await getOrders("/api/orders/seller", seller));
  }
  console.log("OK authenticated orders list fields");
} catch (err) {
  console.log(`FAIL ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
