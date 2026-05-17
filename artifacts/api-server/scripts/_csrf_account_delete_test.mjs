/**
 * One-off: create disposable user on DB (staging/local only), exercise CSRF on POST /api/account/delete.
 * Deletes script after run. Does not print passwords, tokens, cookies, or DATABASE_URL.
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
const TEST_PASSWORD = "CsrfDel99!x";
const email = `csrf-del-${Date.now()}@example.invalid`;

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
    [email, hash, "CSRF Test User", "+4912345678900", "Berlin"],
  );
  out.steps.createdUser = true;
  out.steps.createdUserId = ins.rows[0]?.id ?? null;

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  grabCookie(login, jar);
  out.steps.loginStatus = login.status;
  out.steps.loginOk = login.status === 200;

  const me1 = await fetch(`${BASE}/api/auth/me`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  grabCookie(me1, jar);
  const me1j = await me1.json().catch(() => ({}));
  out.steps.meAfterLoginStatus = me1.status;
  out.steps.meHasCsrfShape =
    typeof me1j.csrfToken === "string" && me1j.csrfToken.length >= 32;
  const csrf = typeof me1j.csrfToken === "string" ? me1j.csrfToken : "";

  const delNoHdr = await fetch(`${BASE}/api/account/delete`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  out.steps.deleteWithoutCsrfStatus = delNoHdr.status;
  out.steps.deleteWithoutCsrfIs403 = delNoHdr.status === 403;

  const delOk = await fetch(`${BASE}/api/account/delete`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  out.steps.deleteWithCsrfStatus = delOk.status;
  out.steps.deleteWithCsrfOk = delOk.status === 200;

  const me2 = await fetch(`${BASE}/api/auth/me`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.meAfterDeleteStatus = me2.status;
  out.steps.meAfterDelete401 = me2.status === 401;

  const loginAgain = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  out.steps.reloginDeletedStatus = loginAgain.status;
  out.steps.reloginDeletedRejected = loginAgain.status === 401;

  const demoPw = process.env.STAGING_SEED_TEST_PASSWORD?.trim();
  if (demoPw && demoPw.length >= 8) {
    const jar2 = { cookie: "" };
    const d = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: "souq-staging-demo@example.com", password: demoPw }),
    });
    grabCookie(d, jar2);
    out.steps.otherUserLoginStatus = d.status;
    const meD = await fetch(`${BASE}/api/auth/me`, {
      headers: jar2.cookie ? { cookie: jar2.cookie } : {},
      credentials: "include",
    });
    out.steps.otherUserMeStatus = meD.status;
    const dm = await meD.json().catch(() => ({}));
    const demoCsrf = typeof dm.csrfToken === "string" ? dm.csrfToken : "";
    const lo = await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": demoCsrf,
        ...(jar2.cookie ? { cookie: jar2.cookie } : {}),
      },
      credentials: "include",
    });
    out.steps.demoLogoutStatus = lo.status;
  } else {
    out.steps.otherUserLoginSkipped = true;
  }

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
