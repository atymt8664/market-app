/**
 * Local/staging: real presence via POST /api/users/presence-batch + WebSocket.
 * Seeds two disposable users (SQL), exercises online/offline/block. No secrets in stdout.
 */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const BASE = (process.env.TEST_API_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
const WS_ORIGIN = BASE.replace(/^http/, "ws");

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

const PW = "PresenceE2E99!x";

function grabCookie(res, jar) {
  const list = res.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    const p = c.split(";")[0];
    if (p.startsWith("souq.sid=")) jar.cookie = p;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(email, password) {
  const jar = { cookie: "" };
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`login ${res.status}: ${t.slice(0, 200)}`);
  }
  grabCookie(res, jar);
  const data = await res.json();
  if (!jar.cookie) throw new Error("no session cookie from login");
  return { jar, csrf: data.csrfToken, id: data.id };
}

async function presenceBatch(jar, userIds) {
  const res = await fetch(`${BASE}/api/users/presence-batch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.cookie,
    },
    body: JSON.stringify({ userIds }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`presence-batch ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`presence-batch ${res.status}: ${text.slice(0, 300)}`);
  return json;
}

function openWs(jar) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_ORIGIN}/api/ws`, {
      headers: { Cookie: jar.cookie, Origin: BASE.replace(/\/$/, "") },
    });
    const t = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error("ws open timeout"));
    }, 8000);
    ws.on("open", () => {
      clearTimeout(t);
      resolve(ws);
    });
    ws.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function blockUser(jar, csrf, targetId) {
  const res = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.cookie,
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok && res.status !== 201 && res.status !== 200) {
    const t = await res.text().catch(() => "");
    throw new Error(`block ${res.status}: ${t.slice(0, 200)}`);
  }
}

async function unblockUser(jar, csrf, targetId) {
  const res = await fetch(`${BASE}/api/users/${targetId}/block`, {
    method: "DELETE",
    headers: {
      cookie: jar.cookie,
      "x-csrf-token": csrf,
    },
  });
  if (!res.ok && res.status !== 200) {
    const t = await res.text().catch(() => "");
    throw new Error(`unblock ${res.status}: ${t.slice(0, 200)}`);
  }
}

async function main() {
  const results = {
    ok: true,
    health: false,
    steps: [],
    presenceHttpCalls: 0,
    errors: [],
  };

  try {
    const hz = await fetch(`${BASE}/api/healthz`);
    results.health = hz.ok;
    if (!hz.ok) {
      results.ok = false;
      results.errors.push("healthz not ok — is API running on TEST_API_BASE?");
      console.log(JSON.stringify(results, null, 2));
      process.exit(1);
    }
    results.steps.push("healthz ok");

    const ts = Date.now();
    const emailA = `presence-a-${ts}@example.invalid`;
    const emailB = `presence-b-${ts}@example.invalid`;
    const hash = await bcrypt.hash(PW, 10);

    const insA = await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1, $2, $3, $4, $5, true, false) returning id`,
      [emailA, hash, "Presence A", "+491111119901", "Berlin"],
    );
    const idA = insA.rows[0].id;
    const insB = await pool.query(
      `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
       values ($1, $2, $3, $4, $5, true, false) returning id`,
      [emailB, hash, "Presence B", "+491111119902", "Munich"],
    );
    const idB = insB.rows[0].id;
    results.steps.push({ seeded: { idA, idB } });

    const userA = await login(emailA, PW);
    const userB = await login(emailB, PW);
    results.steps.push("login A and B");

    const pb = async (label, jar, ids) => {
      results.presenceHttpCalls += 1;
      const j = await presenceBatch(jar, ids);
      results.steps.push({ presence: label, forIds: ids, sample: j.byUserId[String(ids[0])] });
      return j;
    };

    let j1 = await pb("A sees B (no ws yet)", userA.jar, [idB]);
    let eB1 = j1.byUserId[String(idB)];
    if (!eB1 || eB1.visibility !== "full" || eB1.isOnline !== false) {
      throw new Error("expected B offline before ws");
    }

    const wsB = await openWs(userB.jar);
    results.steps.push("B websocket open");
    await sleep(600);
    let j2 = await pb("A sees B (B has ws)", userA.jar, [idB]);
    let eB2 = j2.byUserId[String(idB)];
    if (!eB2 || eB2.visibility !== "full" || eB2.isOnline !== true) {
      throw new Error("expected B online with open ws");
    }

    await new Promise((resolve, reject) => {
      wsB.once("close", resolve);
      wsB.once("error", reject);
      wsB.close();
    });
    results.steps.push("B websocket closed");
    await sleep(800);
    let j3 = await pb("A sees B after disconnect", userA.jar, [idB]);
    let eB3 = j3.byUserId[String(idB)];
    if (!eB3 || eB3.visibility !== "full" || eB3.isOnline !== false || !eB3.lastSeenAt) {
      throw new Error("expected B offline with lastSeenAt after disconnect");
    }

    const wsB2 = await openWs(userB.jar);
    results.steps.push("B websocket reopened");
    await sleep(600);
    let j4 = await pb("A sees B online again", userA.jar, [idB]);
    let eB4 = j4.byUserId[String(idB)];
    if (!eB4 || eB4.visibility !== "full" || eB4.isOnline !== true) {
      throw new Error("expected B online again");
    }
    wsB2.close();
    await sleep(200);

    await blockUser(userA.jar, userA.csrf, idB);
    results.steps.push("A blocked B");
    let j5 = await pb("A sees B hidden after block", userA.jar, [idB]);
    let eB5 = j5.byUserId[String(idB)];
    if (!eB5 || eB5.visibility !== "hidden") {
      throw new Error("expected hidden presence when blocked");
    }

    await unblockUser(userA.jar, userA.csrf, idB);
    results.steps.push("A unblocked B");
    let j6 = await pb("A sees B full after unblock", userA.jar, [idB]);
    let eB6 = j6.byUserId[String(idB)];
    if (!eB6 || eB6.visibility !== "full") {
      throw new Error("expected full visibility after unblock");
    }

    results.summary = {
      presenceHttpCalls: results.presenceHttpCalls,
      note: "UI surfaces share same batch API; no per-card spam in this harness.",
    };

    await pool.query("delete from user_blocks where blocker_id = $1 and blocked_id = $2", [idA, idB]);
    await pool.query("delete from users where id = any($1::int[])", [[idA, idB]]);
    results.steps.push("cleaned up users");
  } catch (e) {
    results.ok = false;
    results.errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.ok ? 0 : 1);
}

void main();
