/**
 * P6-SECURITY-5 + P6-PRIVACY-3 HTTP verification.
 */
import pg from "pg";
import { resolveUserPresenceForViewer } from "../src/lib/user-presence-privacy.ts";

const API = (process.env.LOCAL_API || "http://127.0.0.1:3001").replace(/\/$/, "");
const EMAIL = process.env.STAGING_VERIFY_EMAIL || "";
const PASSWORD = process.env.STAGING_VERIFY_PASSWORD || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

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
    if (part?.startsWith("souq.sid=")) cookie = part;
  }
  return { res, json };
}

async function readPrivacyColumns(userId) {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const { rows } = await pool.query(
      "SELECT presence_activity_visible, presence_last_seen_visible FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    return rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

async function getUserId(email) {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email.toLowerCase()]);
    return rows[0]?.id ?? null;
  } finally {
    await pool.end();
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error("Set STAGING_VERIFY_EMAIL/PASSWORD");

  let { res, json } = await api("/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
    useSession: false,
  });
  if (res.ok && json.requiresTwoFactor) throw new Error("Test user has 2FA — disable first");
  record("login", res.ok, { status: res.status });
  let csrf = json.csrfToken;

  ({ res, json } = await api("/account/security-alerts"));
  record("security-alerts returns array", res.ok && Array.isArray(json.alerts), {
    status: res.status,
    count: json.alerts?.length,
  });
  if (json.alerts?.length) {
    const hasSeverity = json.alerts.every((a) => ["info", "warning", "critical"].includes(a.severity));
    record("alerts have severity", hasSeverity, json.alerts[0]);
    const noLogout = !json.alerts.some((a) => a.eventType === "logout");
    record("alerts exclude logout", noLogout, null);
  }

  ({ res, json } = await api("/account/privacy-preferences"));
  record("privacy-preferences GET", res.ok && typeof json.showActivityStatus === "boolean", json);

  ({ res, json } = await api("/account/privacy-preferences", {
    method: "PATCH",
    body: { showActivityStatus: false, showLastSeen: false },
    csrf,
  }));
  record("privacy hide all", res.ok && json.showActivityStatus === false && json.showLastSeen === false, json);

  const userId = await getUserId(EMAIL);
  const dbHidden = await readPrivacyColumns(userId);
  record(
    "db privacy columns hidden",
    dbHidden?.presence_activity_visible === false && dbHidden?.presence_last_seen_visible === false,
    dbHidden,
  );

  const resolvedHidden = resolveUserPresenceForViewer({
    activityVisible: false,
    lastSeenVisible: false,
    lastSeenAt: new Date(),
    isOnline: true,
  });
  record("presence resolver hidden", resolvedHidden.visibility === "hidden", resolvedHidden);

  ({ res, json } = await api("/account/privacy-preferences", {
    method: "PATCH",
    body: { showActivityStatus: true, showLastSeen: true },
    csrf,
  }));
  record("privacy restore defaults", res.ok && json.showActivityStatus === true, json);

  const resolvedVisible = resolveUserPresenceForViewer({
    activityVisible: true,
    lastSeenVisible: true,
    lastSeenAt: new Date(),
    isOnline: false,
  });
  record("presence resolver visible", resolvedVisible.visibility === "full", resolvedVisible);

  console.log(JSON.stringify({ api: API, steps, pass: true }, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ api: API, steps, pass: false, error: String(e.message || e) }, null, 2));
  process.exit(1);
});
