/**
 * Local/staging: user_blocks table + CSRF on POST/DELETE block, GET block-status.
 * Applies 008_user_blocks.sql if needed, seeds disposable users, cleans up.
 * Does not log passwords, tokens, cookies, or DATABASE_URL.
 */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
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

const BASE = (process.env.TEST_API_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
const PW = "CsrfBlk99!x";
const ts = Date.now();
const blockerEmail = `csrf-block-b-${ts}@example.invalid`;
const targetEmail = `csrf-block-t-${ts}@example.invalid`;

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

async function main() {
  const out = { ok: true, steps: {} };

  const migrationPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "lib",
    "db",
    "migrations",
    "008_user_blocks.sql",
  );
  const sql008 = fs.readFileSync(migrationPath, "utf8");
  await pool.query(sql008);
  out.steps.migration008 = "applied";

  const hash = await bcrypt.hash(PW, 10);

  const insB = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [blockerEmail, hash, "Blocker", "+491111111201", "Berlin"],
  );
  const blockerId = insB.rows[0].id;

  const insT = await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1, $2, $3, $4, $5, true, false) returning id`,
    [targetEmail, hash, "Target", "+491111111202", "Munich"],
  );
  const targetId = insT.rows[0].id;
  out.steps.seed = { blockerId, targetId };

  const jar = { cookie: "" };

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: blockerEmail, password: PW }),
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

  const statusNoAuth = await fetch(`${BASE}/api/users/${targetId}/block-status`, {
    method: "GET",
    credentials: "omit",
  });
  out.steps.blockStatusNoAuth = statusNoAuth.status;

  const statusOk = await fetch(`${BASE}/api/users/${targetId}/block-status`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.blockStatusOk = statusOk.status;
  const statusBody = await statusOk.json().catch(() => ({}));
  out.steps.blockStatusBody = statusBody;

  const selfStatus = await fetch(`${BASE}/api/users/${blockerId}/block-status`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  out.steps.blockStatusSelf = selfStatus.status;

  const postNoCsrf = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "POST",
    headers: jar.cookie ? { cookie: jar.cookie, accept: "application/json" } : { accept: "application/json" },
    credentials: "include",
  });
  out.steps.postBlockNoCsrf = postNoCsrf.status;

  const postBadCsrf = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "x-csrf-token": "0".repeat(64),
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.postBlockBadCsrf = postBadCsrf.status;

  const postSelf = await fetch(`${BASE}/api/users/${blockerId}/block`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.postBlockSelf = postSelf.status;

  const post1 = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.postBlock1 = post1.status;
  const post1j = await post1.json().catch(() => ({}));
  out.steps.postBlock1Body = post1j;

  const post2 = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.postBlock2 = post2.status;
  const post2j = await post2.json().catch(() => ({}));
  out.steps.postBlock2Body = post2j;

  const statusAfter = await fetch(`${BASE}/api/users/${targetId}/block-status`, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    credentials: "include",
  });
  const statusAfterJ = await statusAfter.json().catch(() => ({}));
  out.steps.blockStatusAfter = { status: statusAfter.status, body: statusAfterJ };

  const delNoCsrf = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "DELETE",
    headers: jar.cookie ? { cookie: jar.cookie, accept: "application/json" } : { accept: "application/json" },
    credentials: "include",
  });
  out.steps.delBlockNoCsrf = delNoCsrf.status;

  const del1 = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.delBlock1 = del1.status;
  const del1j = await del1.json().catch(() => ({}));
  out.steps.delBlock1Body = del1j;

  const del2 = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      "x-csrf-token": csrf,
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
    },
    credentials: "include",
  });
  out.steps.delBlock2 = del2.status;
  const del2j = await del2.json().catch(() => ({}));
  out.steps.delBlock2Body = del2j;

  await pool.query(`delete from users where id in ($1, $2)`, [blockerId, targetId]);
  out.steps.cleanup = "ok";

  const e403 = (s) => s === 403;
  const e401 = (s) => s === 401;
  const e400 = (s) => s === 400;
  const e2xx = (s) => s >= 200 && s < 300;

  out.ok =
    out.steps.loginStatus === 200 &&
    out.steps.meHasCsrfShape &&
    e401(out.steps.blockStatusNoAuth) &&
    e2xx(out.steps.blockStatusOk) &&
    statusBody.blockedByMe === false &&
    e400(out.steps.blockStatusSelf) &&
    e403(out.steps.postBlockNoCsrf) &&
    e403(out.steps.postBlockBadCsrf) &&
    e400(out.steps.postBlockSelf) &&
    post1.status === 201 &&
    post1j.blocked === true &&
    post1j.created === true &&
    post2.status === 200 &&
    post2j.blocked === true &&
    post2j.created === false &&
    statusAfterJ.blockedByMe === true &&
    e403(out.steps.delBlockNoCsrf) &&
    del1.status === 200 &&
    del1j.blocked === false &&
    del1j.removed === true &&
    del2.status === 200 &&
    del2j.blocked === false &&
    del2j.removed === false;

  await pool.end();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  process.exit(1);
});
