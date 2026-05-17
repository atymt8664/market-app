/**
 * Local/staging: disposable user + CSRF checks for POST/PATCH/DELETE /api/ads.
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
const TEST_PASSWORD = "CsrfAds99!x";
const email = `csrf-ads-${Date.now()}@example.invalid`;

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function main() {
  const out = { ok: true, steps: {} };
  const jar = { cookie: "" };

  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  const ins = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false)
     returning id`,
    [email, hash, "CSRF Ads Test", "+4912345678901", "Berlin"],
  );
  out.steps.createdUser = true;

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  grabCookie(login, jar);
  out.steps.loginStatus = login.status;

  const me = await fetch(`${BASE}/api/auth/me`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  grabCookie(me, jar);
  const mej = await me.json().catch(() => ({}));
  out.steps.meStatus = me.status;
  const csrf = typeof mej.csrfToken === "string" ? mej.csrfToken : "";
  out.steps.meHasCsrfShape = csrf.length >= 32;

  const catsRes = await fetch(`${BASE}/api/categories`);
  out.steps.categoriesStatus = catsRes.status;
  const cats = await catsRes.json().catch(() => []);
  const categoryId = Array.isArray(cats) && cats[0]?.id != null ? Number(cats[0].id) : null;
  out.steps.categoryIdPresent = Number.isFinite(categoryId) && categoryId > 0;
  if (!categoryId) {
    out.ok = false;
    out.steps.reason = "no_categories";
    await pool.end();
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  const adBody = {
    title: "CSRF T",
    description: "Test ad body for CSRF phase five minimum length ok.",
    price: 10,
    priceType: "fixed",
    type: "offer",
    categoryId,
    city: "Berlin",
    sellerName: "Test Seller",
    sellerPhone: "+491111111111",
    images: [],
  };

  const postNo = await fetch(`${BASE}/api/ads`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: JSON.stringify(adBody),
  });
  out.steps.postAdsWithoutCsrfStatus = postNo.status;
  out.steps.postAdsWithoutCsrfIs403 = postNo.status === 403;

  const postOk = await fetch(`${BASE}/api/ads`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: JSON.stringify(adBody),
  });
  out.steps.postAdsWithCsrfStatus = postOk.status;
  const created = await postOk.json().catch(() => ({}));
  const adId = typeof created.id === "number" ? created.id : null;
  out.steps.createdAdId = adId;
  out.steps.postAdsWithCsrfOk = postOk.status === 201 && adId != null;

  if (!adId) {
    out.ok = false;
    await pool.end();
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  const patchNo = await fetch(`${BASE}/api/ads/${adId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ title: "CSRF T2" }),
  });
  out.steps.patchAdsWithoutCsrfStatus = patchNo.status;
  out.steps.patchAdsWithoutCsrfIs403 = patchNo.status === 403;

  const patchOk = await fetch(`${BASE}/api/ads/${adId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ title: "CSRF T3" }),
  });
  out.steps.patchAdsWithCsrfStatus = patchOk.status;
  out.steps.patchAdsWithCsrfOk = patchOk.status === 200;

  const delNo = await fetch(`${BASE}/api/ads/${adId}`, {
    method: "DELETE",
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.deleteAdsWithoutCsrfStatus = delNo.status;
  out.steps.deleteAdsWithoutCsrfIs403 = delNo.status === 403;

  const delOk = await fetch(`${BASE}/api/ads/${adId}`, {
    method: "DELETE",
    headers: {
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.deleteAdsWithCsrfStatus = delOk.status;
  out.steps.deleteAdsWithCsrfOk = delOk.status === 204;

  const listPub = await fetch(`${BASE}/api/ads?limit=3`);
  out.steps.listAdsPublicStatus = listPub.status;

  const feat = await fetch(`${BASE}/api/ads/featured`);
  out.steps.featuredAdsStatus = feat.status;

  const getDeleted = await fetch(`${BASE}/api/ads/${adId}`);
  out.steps.getAdAfterDeleteStatus = getDeleted.status;

  const likeNoCsrf = await fetch(`${BASE}/api/ads/${adId}/like`, {
    method: "POST",
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.likeAfterDeleteStatus = likeNoCsrf.status;

  const favList = await fetch(`${BASE}/api/ads/favorites`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.favoritesListStatus = favList.status;

  const conv = await fetch(`${BASE}/api/conversations`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.conversationsStatus = conv.status;

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

  out.ok =
    out.steps.postAdsWithoutCsrfIs403 &&
    out.steps.patchAdsWithoutCsrfIs403 &&
    out.steps.deleteAdsWithoutCsrfIs403 &&
    out.steps.postAdsWithCsrfOk &&
    out.steps.patchAdsWithCsrfOk &&
    out.steps.deleteAdsWithCsrfOk;

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
