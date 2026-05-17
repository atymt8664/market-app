/**
 * Local/staging: user CSRF on like/favorite/follow mutations.
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
const PW = "CsrfSoc99!x";
const ts = Date.now();
const ownerEmail = `csrf-soc-o-${ts}@example.invalid`;
const actorEmail = `csrf-soc-a-${ts}@example.invalid`;

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function req(method, rel, jar, csrf, withCsrf) {
  const headers = {};
  if (jar.cookie) headers.cookie = jar.cookie;
  if (withCsrf && csrf) headers["x-csrf-token"] = csrf;
  return fetch(`${BASE}${rel}`, { method, headers, credentials: "include" });
}

async function main() {
  const out = { ok: true, steps: {} };
  const jar = { cookie: "" };
  const hash = await bcrypt.hash(PW, 10);

  const insO = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [ownerEmail, hash, "Soc Owner", "+491111111101", "Berlin"],
  );
  const ownerId = insO.rows[0].id;

  const insA = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [actorEmail, hash, "Soc Actor", "+491111111102", "Munich"],
  );
  const actorId = insA.rows[0].id;

  const cat = await pool.query(`select id from categories where is_hidden = false order by id asc limit 1`);
  const categoryId = cat.rows[0]?.id;
  if (!categoryId) {
    out.ok = false;
    out.steps.reason = "no_category";
    await pool.end();
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  const insAd = await pool.query(
    `insert into ads (user_id, title, description, city, category_id, seller_name, seller_phone, status, images)
     values ($1, $2, $3, $4, $5, $6, $7, 'approved', '[]'::jsonb) returning id`,
    [
      ownerId,
      "CSRF soc",
      "Approved ad for social CSRF integration test body.",
      "Berlin",
      categoryId,
      "Seller",
      "+493333333333",
    ],
  );
  const adId = insAd.rows[0].id;
  out.steps.seed = { ownerId, actorId, adId };

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: actorEmail, password: PW }),
  });
  grabCookie(login, jar);
  out.steps.loginStatus = login.status;

  const me = await fetch(`${BASE}/api/auth/me`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  const mej = await me.json().catch(() => ({}));
  const csrf = typeof mej.csrfToken === "string" ? mej.csrfToken : "";
  out.steps.meHasCsrfShape = csrf.length >= 32;

  const pairs = [
    ["postFavoriteNoCsrf", "POST", `/api/ads/${adId}/favorite`, false],
    ["postFavoriteOk", "POST", `/api/ads/${adId}/favorite`, true],
    ["delFavoriteNoCsrf", "DELETE", `/api/ads/${adId}/favorite`, false],
    ["delFavoriteOk", "DELETE", `/api/ads/${adId}/favorite`, true],
    ["postLikeNoCsrf", "POST", `/api/ads/${adId}/like`, false],
    ["postLikeOk", "POST", `/api/ads/${adId}/like`, true],
    ["delLikeNoCsrf", "DELETE", `/api/ads/${adId}/like`, false],
    ["delLikeOk", "DELETE", `/api/ads/${adId}/like`, true],
    ["postFollowNoCsrf", "POST", `/api/users/${ownerId}/follow`, false],
    ["postFollowOk", "POST", `/api/users/${ownerId}/follow`, true],
    ["delFollowNoCsrf", "DELETE", `/api/users/${ownerId}/follow`, false],
    ["delFollowOk", "DELETE", `/api/users/${ownerId}/follow`, true],
  ];

  for (const [key, method, rel, withCsrf] of pairs) {
    const r = await req(method, rel, jar, csrf, withCsrf);
    out.steps[key] = r.status;
  }

  const listAds = await fetch(`${BASE}/api/ads?limit=2`);
  out.steps.listAdsPublicStatus = listAds.status;

  const favList = await fetch(`${BASE}/api/ads/favorites`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.favoritesListGetStatus = favList.status;

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

  const expect403 = (k) => out.steps[k] === 403;
  const expect2xx = (k) => out.steps[k] >= 200 && out.steps[k] < 300;

  out.ok =
    expect403("postFavoriteNoCsrf") &&
    expect2xx("postFavoriteOk") &&
    expect403("delFavoriteNoCsrf") &&
    expect2xx("delFavoriteOk") &&
    expect403("postLikeNoCsrf") &&
    expect2xx("postLikeOk") &&
    expect403("delLikeNoCsrf") &&
    expect2xx("delLikeOk") &&
    expect403("postFollowNoCsrf") &&
    expect2xx("postFollowOk") &&
    expect403("delFollowNoCsrf") &&
    expect2xx("delFollowOk") &&
    listAds.status === 200 &&
    favList.status === 200 &&
    conv.status === 200;

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
