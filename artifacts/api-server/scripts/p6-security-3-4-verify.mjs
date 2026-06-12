/**
 * P6-SECURITY-3 + P6-SECURITY-4 local/STAGING HTTP verification.
 * Usage:
 *   LOCAL_API=http://127.0.0.1:3001 STAGING_VERIFY_EMAIL=... STAGING_VERIFY_PASSWORD=... node scripts/p6-security-3-4-verify.mjs
 */
import pg from "pg";
import { generate, verify } from "otplib";

const API = (process.env.LOCAL_API || process.env.STAGING_API || "http://127.0.0.1:3001").replace(/\/$/, "");
const EMAIL = process.env.STAGING_VERIFY_EMAIL || process.env.P6_VERIFY_EMAIL || "";
const PASSWORD = process.env.STAGING_VERIFY_PASSWORD || process.env.P6_VERIFY_PASSWORD || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

if (!EMAIL || !PASSWORD) {
  console.error("Set STAGING_VERIFY_EMAIL and STAGING_VERIFY_PASSWORD");
  process.exit(1);
}

const steps = [];
let cookie = "";

function record(name, ok, detail = null) {
  steps.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

async function api(path, { method = "GET", body, csrf, useSession = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (csrf) headers["X-CSRF-Token"] = csrf;
  if (useSession && cookie) headers.Cookie = cookie;
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  const setCookie =
    res.headers.getSetCookie?.() ||
    (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
  for (const c of setCookie) {
    const part = String(c).split(";")[0]?.trim();
    if (part?.startsWith("souq.sid=")) {
      cookie = part;
    }
  }
  return { res, json };
}

async function readPendingSetupSecret(email) {
  if (!DATABASE_URL) return null;
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
  try {
    const { rows: users } = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email.toLowerCase()]);
    const userId = users[0]?.id;
    if (!userId) return null;
    const { rows: sessions } = await pool.query(
      `SELECT sess FROM user_sessions WHERE sess::text LIKE '%user2faSetupSecret%' ORDER BY expire DESC LIMIT 5`,
    );
    for (const row of sessions) {
      const sess = typeof row.sess === "string" ? JSON.parse(row.sess) : row.sess;
      if (sess?.user2faSetupSecret && typeof sess.user2faSetupSecret === "string") {
        return sess.user2faSetupSecret;
      }
    }
    return null;
  } finally {
    await pool.end();
  }
}

async function readUserTotpSecret(email) {
  if (!DATABASE_URL) return null;
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
  try {
    const { rows } = await pool.query(
      "SELECT totp_secret FROM users WHERE email = $1 LIMIT 1",
      [email.toLowerCase()],
    );
    return rows[0]?.totp_secret || null;
  } finally {
    await pool.end();
  }
}

async function disable2faIfEnabled(csrf, secret) {
  const code = await generate({ secret });
  await api("/account/2fa/disable", {
    method: "POST",
    body: { currentPassword: PASSWORD, code },
    csrf,
  });
}

async function main() {
  // Clean slate: login and disable 2FA if already on
  let { res, json } = await api("/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });

  if (res.ok && json.requiresTwoFactor) {
    const secret = await readUserTotpSecret(EMAIL);
    const code = secret ? await generate({ secret }) : "";
    ({ res, json } = await api("/auth/login/totp", { method: "POST", body: { code } }));
  }

  record("login baseline", res.ok, { status: res.status, json });

  let csrf = json.csrfToken;
  ({ res, json } = await api("/auth/me"));
  csrf = json.csrfToken || csrf;
  record("auth/me csrf", typeof csrf === "string" && csrf.length >= 32, { csrf: Boolean(csrf) });

  try {
    const status0 = await api("/account/2fa/status");
    if (status0.json.enabled) {
      const secret = await readUserTotpSecret(EMAIL);
      if (secret) {
        await disable2faIfEnabled(csrf, secret);
        ({ res, json } = await api("/auth/me"));
        csrf = json.csrfToken || csrf;
      }
    }
  } catch {
    /* ignore cleanup errors */
  }

  // Enable 2FA
  ({ res, json } = await api("/account/2fa/setup/start", {
    method: "POST",
    body: { currentPassword: PASSWORD },
    csrf,
  }));
  record("2fa setup/start", res.ok, { status: res.status, json });

  ({ res, json } = await api("/account/2fa/setup/qr"));
  record("2fa setup/qr", res.ok && typeof json.qrDataUrl === "string", { status: res.status });

  const pendingSecret = await readPendingSetupSecret(EMAIL);
  record("read pending setup secret", Boolean(pendingSecret), { pendingSecret: Boolean(pendingSecret) });

  const setupCode = await generate({ secret: pendingSecret });
  ({ res, json } = await api("/account/2fa/setup/confirm", {
    method: "POST",
    body: { currentPassword: PASSWORD, code: setupCode },
    csrf,
  }));
  record("2fa setup/confirm", res.ok && Array.isArray(json.backupCodes) && json.backupCodes.length === 10, {
    status: res.status,
    backupCount: json.backupCodes?.length,
  });

  const backupCode = json.backupCodes[0];

  ({ res, json } = await api("/account/2fa/status"));
  record("2fa status enabled", res.ok && json.enabled === true, json);

  // Logout
  await api("/auth/logout", { method: "POST", csrf });

  // Login with 2FA — TOTP path
  ({ res, json } = await api("/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  }));
  record("login requires 2FA", res.ok && json.requiresTwoFactor === true, json);

  const liveSecret = await readUserTotpSecret(EMAIL);
  const loginCode = await generate({ secret: liveSecret });
  ({ res, json } = await api("/auth/login/totp", { method: "POST", body: { code: loginCode } }));
  record("login/totp success", res.ok && json.id, { status: res.status, userId: json.id });
  csrf = json.csrfToken;

  ({ res, json } = await api("/account/security-log"));
  const eventTypes = (json.events || []).map((e) => e.eventType);
  record("security log has login events", eventTypes.includes("login.2fa") || eventTypes.includes("2fa.enable"), {
    eventTypes,
  });

  // Disable 2FA using backup code (recovery path)
  await api("/auth/logout", { method: "POST", csrf });
  ({ res, json } = await api("/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } }));
  record("login requires 2FA (backup test)", json.requiresTwoFactor === true, json);
  ({ res, json } = await api("/auth/login/totp", { method: "POST", body: { code: backupCode } }));
  record("login/totp backup code", res.ok, { status: res.status });
  csrf = json.csrfToken;

  const disableTotp = await generate({ secret: liveSecret });
  ({ res, json } = await api("/account/2fa/disable", {
    method: "POST",
    body: { currentPassword: PASSWORD, code: disableTotp },
    csrf,
  }));
  record("2fa disable", res.ok, { status: res.status });

  ({ res, json } = await api("/account/2fa/status"));
  record("2fa status disabled", res.ok && json.enabled === false, json);

  console.log(JSON.stringify({ api: API, steps, pass: true }, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ api: API, steps, pass: false, error: String(e.message || e) }, null, 2));
  process.exit(1);
});
