#!/usr/bin/env bash
# P17-PROD-FIX-1 — Read-only production integrity audit (no mutations, no secret output).
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_ENV="/opt/souq-arab/config/api.env.production"
LOG="/var/log/souq-arab/p17-prod-fix-1-audit.log"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }

[[ "$(id -u)" -eq 0 ]] || { echo "HALT: run with sudo"; exit 2; }
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-PROD-FIX-1 audit start ==="

# --- Env isolation ---
grep -q "$STAGING_REF" "$PROD_ENV" && { log "HALT: STAGING ref in production env"; exit 2; }
grep -q "$PROD_REF" "$PROD_ENV" || { log "HALT: PRODUCTION ref missing"; exit 2; }
log "ENV_REF_OK production_ref_present staging_ref_absent"

for key in P17_ORDERS_API_ENABLED P17_ORDERS_PRODUCTION_ALLOWED; do
  grep -qE "^${key}=1" "$PROD_ENV" && log "FLAG_OK ${key}=1" || log "FLAG_OFF ${key}"
done

SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
[[ -n "$SC" ]] || { log "HALT: prod-shadow container missing"; exit 2; }
log "CONTAINER_OK ${SC}"

docker cp "$PROD_ENV" "${SC}:/tmp/p17-fix-audit.env" >/dev/null

docker exec "$SC" node - <<'NODE' | tee -a "$LOG"
const fs = require("fs");
const pg = require("pg");

const PROD_REF = "nptfxtkedqndkgmrcntn";
const STAGING_REF = "qkczposlooaldmsjfmun";

function loadEnv(path) {
  const out = {};
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

const env = loadEnv("/tmp/p17-fix-audit.env");
const dbUrl = env.DATABASE_URL || "";
const supaUrl = env.SUPABASE_URL || "";
const blob = `${dbUrl}\n${supaUrl}`.toLowerCase();

console.log("RUNTIME_REF", blob.includes(PROD_REF) ? PROD_REF : blob.includes(STAGING_REF) ? STAGING_REF : "UNKNOWN");
console.log("P17_ORDERS_API_ENABLED", env.P17_ORDERS_API_ENABLED === "1" ? "on" : "off");
console.log("P17_ORDERS_PRODUCTION_ALLOWED", env.P17_ORDERS_PRODUCTION_ALLOWED === "1" ? "on" : "off");

(async () => {
  const pool = new pg.Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const ads = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'approved')::int AS approved,
        count(*) FILTER (WHERE status = 'pending')::int AS pending,
        count(*) FILTER (WHERE status = 'hidden')::int AS hidden,
        count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        count(*) FILTER (WHERE title ILIKE '%P17-PROD2%' OR title ILIKE '%P17ProdE2e%' OR title ILIKE '%P17 E2E%')::int AS test_titled_ads
      FROM ads
    `);
    console.log("ADS_COUNTS", JSON.stringify(ads.rows[0]));

    const testAds = await pool.query(`
      SELECT id, status, left(title, 80) AS title_prefix, created_at
      FROM ads
      WHERE title ILIKE '%P17-PROD2%' OR title ILIKE '%P17ProdE2e%' OR title ILIKE '%P17 E2E%' OR title ILIKE '%smoke%'
      ORDER BY id DESC
      LIMIT 20
    `);
    console.log("TEST_ADS_SAMPLE_COUNT", testAds.rowCount);
    for (const r of testAds.rows) console.log("TEST_AD", r.id, r.status, r.title_prefix);

    const orders = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE oi.title ILIKE '%P17-PROD2%' OR oi.title ILIKE '%P17ProdE2e%' OR oi.title ILIKE '%P17 E2E%')::int AS test_titled_orders,
        count(*) FILTER (WHERE o.fulfillment_mode = 'pickup')::int AS pickup,
        count(*) FILTER (WHERE o.fulfillment_mode = 'shipping')::int AS shipping
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `);
    console.log("ORDERS_COUNTS", JSON.stringify(orders.rows[0]));

    const testOrders = await pool.query(`
      SELECT o.order_number, o.status, o.fulfillment_mode, left(oi.title, 80) AS item_title, o.created_at
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE oi.title ILIKE '%P17-PROD2%' OR oi.title ILIKE '%P17ProdE2e%' OR oi.title ILIKE '%P17 E2E%'
      ORDER BY o.created_at DESC
      LIMIT 20
    `);
    console.log("TEST_ORDERS_SAMPLE_COUNT", testOrders.rowCount);
    for (const r of testOrders.rows) console.log("TEST_ORDER", r.order_number, r.status, r.fulfillment_mode, r.item_title);

    const e2eUsers = await pool.query(`
      SELECT count(*)::int AS c FROM users WHERE email ILIKE '%p17%prod%' OR email ILIKE '%p17prod%' OR email ILIKE '%e2e%@%' 
    `);
    console.log("SUSPECT_USER_EMAILS", e2eUsers.rows[0].c);

    const publicAds = await pool.query(`
      SELECT count(*)::int AS public_listing_count
      FROM ads
      WHERE status = 'approved' AND deleted_at IS NULL
    `);
    console.log("PUBLIC_ADS_APPROVED_NOT_DELETED", publicAds.rows[0].public_listing_count);

    const recentApproved = await pool.query(`
      SELECT id, left(title, 60) AS title_prefix, status, deleted_at IS NOT NULL AS is_deleted
      FROM ads WHERE status = 'approved' ORDER BY id DESC LIMIT 5
    `);
    for (const r of recentApproved.rows) console.log("RECENT_APPROVED_AD", r.id, r.title_prefix, r.is_deleted ? "deleted" : "live");

  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.log("DB_AUDIT_FAIL", e.message || String(e));
  process.exit(1);
});
NODE

# Public API probes (no auth)
API="https://api.souq-arab.com"
code_ads=$(curl -sS -o /tmp/p17-fix-ads.json -w '%{http_code}' "${API}/api/ads?limit=5&offset=0" || true)
log "PUBLIC_API_ADS_HTTP ${code_ads}"
if [[ -f /tmp/p17-fix-ads.json ]]; then
  node -e "const j=require('/tmp/p17-fix-ads.json'); console.log('PUBLIC_API_ADS_TOTAL', j.total ?? j.items?.length ?? 'unknown');" | tee -a "$LOG" || true
fi

log "=== P17-PROD-FIX-1 audit done ==="
