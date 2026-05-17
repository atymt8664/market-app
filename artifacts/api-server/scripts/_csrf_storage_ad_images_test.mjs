/**
 * Local/staging: CSRF on POST /api/storage/uploads/ad-images + POST /api/users/upload-avatar + smoke.
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
const TEST_PASSWORD = "CsrfImg99!x";
const email = `csrf-img-${Date.now()}@example.invalid`;

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

function makePngFormData() {
  const buf = Buffer.from(PNG_BASE64, "base64");
  const file = new File([buf], "probe.png", { type: "image/png" });
  const fd = new FormData();
  fd.append("images", file);
  return fd;
}

async function main() {
  const out = { ok: true, steps: {} };
  const jar = { cookie: "" };

  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false)`,
    [email, hash, "CSRF Img Test", "+4912345678902", "Berlin"],
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

  const upNo = await fetch(`${BASE}/api/storage/uploads/ad-images`, {
    method: "POST",
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
    body: makePngFormData(),
  });
  out.steps.uploadAdImagesWithoutCsrfStatus = upNo.status;
  out.steps.uploadAdImagesWithoutCsrfIs403 = upNo.status === 403;

  const upOk = await fetch(`${BASE}/api/storage/uploads/ad-images`, {
    method: "POST",
    headers: {
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: makePngFormData(),
  });
  out.steps.uploadAdImagesWithCsrfStatus = upOk.status;
  const upBody = await upOk.json().catch(() => ({}));
  out.steps.uploadAdImagesWithCsrfHasUrls =
    upOk.status === 200 &&
    Array.isArray(upBody.imageUrls) &&
    upBody.imageUrls.length > 0 &&
    typeof upBody.imageUrls[0] === "string";
  out.steps.uploadAdImagesWithCsrf503 = upOk.status === 503;

  const catsRes = await fetch(`${BASE}/api/categories`);
  out.steps.categoriesStatus = catsRes.status;
  const cats = await catsRes.json().catch(() => []);
  const categoryId = Array.isArray(cats) && cats[0]?.id != null ? Number(cats[0].id) : null;

  const firstImageUrl =
    upOk.status === 200 && Array.isArray(upBody.imageUrls) && typeof upBody.imageUrls[0] === "string"
      ? upBody.imageUrls[0]
      : null;

  let postAdStatus = 0;
  if (categoryId && csrf.length >= 32 && firstImageUrl) {
    const adBody = {
      title: "Img CSRF T",
      description: "Test ad after image upload CSRF phase six ok here.",
      price: 11,
      priceType: "fixed",
      type: "offer",
      categoryId,
      city: "Berlin",
      sellerName: "T",
      sellerPhone: "+492222222222",
      images: [firstImageUrl],
    };
    const postAd = await fetch(`${BASE}/api/ads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        ...(jar.cookie ? { cookie: jar.cookie } : {}),
      },
      credentials: "include",
      body: JSON.stringify(adBody),
    });
    postAdStatus = postAd.status;
    const adJson = await postAd.json().catch(() => ({}));
    out.steps.postAdAfterUploadStatus = postAdStatus;
    out.steps.postAdAfterUploadOk = postAdStatus === 201;
    const adId = typeof adJson.id === "number" ? adJson.id : null;
    if (adId) {
      const del = await fetch(`${BASE}/api/ads/${adId}`, {
        method: "DELETE",
        headers: {
          "x-csrf-token": csrf,
          ...(jar.cookie ? { cookie: jar.cookie } : {}),
        },
        credentials: "include",
      });
      out.steps.cleanupDeleteAdStatus = del.status;
    }
  } else {
    out.steps.postAdAfterUploadSkipped = true;
  }

  const avFd = new FormData();
  const avBuf = Buffer.from(PNG_BASE64, "base64");
  avFd.append("image", new File([avBuf], "a.png", { type: "image/png" }));
  const avNo = await fetch(`${BASE}/api/users/upload-avatar`, {
    method: "POST",
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
    body: avFd,
  });
  out.steps.avatarUploadWithoutUserCsrfStatus = avNo.status;
  out.steps.avatarUploadWithoutUserCsrfIs403 = avNo.status === 403;

  const avFdOk = new FormData();
  avFdOk.append("image", new File([avBuf], "b.png", { type: "image/png" }));
  const avOk = await fetch(`${BASE}/api/users/upload-avatar`, {
    method: "POST",
    headers: {
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: avFdOk,
  });
  out.steps.avatarUploadWithUserCsrfStatus = avOk.status;
  const avBody = await avOk.json().catch(() => ({}));
  out.steps.avatarUploadWithCsrfHasImageUrl =
    avOk.status === 200 &&
    typeof avBody.imageUrl === "string" &&
    avBody.imageUrl.length > 0;
  out.steps.avatarUploadWithCsrf503 = avOk.status === 503;

  const meAfter = await fetch(`${BASE}/api/auth/me`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  const meAfterJ = await meAfter.json().catch(() => ({}));
  out.steps.meAfterAvatarHasUrlShape =
    typeof meAfterJ.avatarUrl === "string" && meAfterJ.avatarUrl.length > 0;

  const listAds = await fetch(`${BASE}/api/ads?limit=2`);
  out.steps.listAdsPublicStatus = listAds.status;

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
    out.steps.uploadAdImagesWithoutCsrfIs403 &&
    (out.steps.uploadAdImagesWithCsrfHasUrls || out.steps.uploadAdImagesWithCsrf503) &&
    out.steps.avatarUploadWithoutUserCsrfIs403 &&
    (out.steps.avatarUploadWithCsrfHasImageUrl || out.steps.avatarUploadWithCsrf503);
  if (
    out.steps.uploadAdImagesWithCsrfHasUrls &&
    !out.steps.postAdAfterUploadOk &&
    !out.steps.postAdAfterUploadSkipped
  ) {
    out.ok = false;
  }
  if (out.steps.avatarUploadWithCsrfHasImageUrl && !out.steps.meAfterAvatarHasUrlShape) {
    out.ok = false;
  }

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
