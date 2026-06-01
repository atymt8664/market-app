#!/usr/bin/env bash
# P17 Production API Completion — runs ON Hetzner VPS only (no secret output).
set -euo pipefail

BASE="/opt/souq-arab"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_ENV="${BASE}/config/api.env.production"
COMPOSE="${BASE}/phase7/docker-compose.production-shadow.yml"
RELEASES="${BASE}/releases"
LOG="/var/log/souq-arab/p17-prod-api-completion.log"
TAG="${SOUQ_P17_IMAGE:-souq-api:p17-57-$(date -u +%Y%m%d)}"
BUILD_CTX="${SOUQ_BUILD_CTX:-/tmp/souq-p17-build-context}"
ARCHIVE="${SOUQ_P17_ARCHIVE:-/tmp/p17-prod-build.tgz}"

ok() { printf '  OK  %s\n' "$*"; tee -a "$LOG"; }
bad() { printf '  FAIL %s\n' "$*"; tee -a "$LOG"; FAIL=1; }
note() { printf '  NOTE %s\n' "$*"; tee -a "$LOG"; }
halt() { echo "=== HALT: $* ===" | tee -a "$LOG"; exit 2; }

FAIL=0
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo."; exit 1; }

install -d -m 0755 "$(dirname "$LOG")"
echo "=== P17 prod API completion $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"

shadow_name() {
  docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1
}

echo "=== Phase A — PRODUCTION database tables ==="
[[ -f "$PROD_ENV" ]] || halt "api.env.production missing"
grep -q "$STAGING_REF" "$PROD_ENV" 2>/dev/null && halt "STAGING ref in api.env.production"
grep -q "$PROD_REF" "$PROD_ENV" 2>/dev/null || halt "PRODUCTION ref missing"
ok "api.env.production PRODUCTION ref verified"

SC="$(shadow_name)"
[[ -n "$SC" ]] || halt "prod-shadow container not running"
ok "prod-shadow container: ${SC}"

docker exec "$SC" node -e "
const ref='${PROD_REF}';
const u=process.env.DATABASE_URL||'';
if(!u.includes(ref)){console.log('REFUSE_ENV_REF');process.exit(3);}
const pg=require('pg');
const pool=new pg.Pool({connectionString:u,ssl:{rejectUnauthorized:false}});
const tables=['orders','order_items','order_status_history','buyer_addresses','shipments','shipment_events','order_issues'];
(async()=>{
  const r=await pool.query('select table_name from information_schema.tables where table_schema=\\'public\\' and table_name = any(\$1)',[tables]);
  const found=new Set(r.rows.map(x=>x.table_name));
  let missing=0;
  for(const t of tables){
    if(found.has(t)) console.log('OK '+t);
    else { console.log('MISSING '+t); missing++; }
  }
  await pool.end();
  process.exit(missing?1:0);
})().catch(e=>{console.log('ERR '+e.message);process.exit(2);});
" | tee -a "$LOG" | tee /tmp/p17-table-check.txt

grep -q REFUSE /tmp/p17-table-check.txt 2>/dev/null && halt "prod-shadow not on PRODUCTION ref"
grep -q '^MISSING' /tmp/p17-table-check.txt 2>/dev/null && halt "P17 tables missing on PRODUCTION DB"
grep -q '^ERR' /tmp/p17-table-check.txt 2>/dev/null && halt "DB check failed"
ok "all 7 P17 tables on PRODUCTION"

echo "=== Phase B — Production environment flags ==="
for key in P17_ORDERS_API_ENABLED P17_ORDERS_PRODUCTION_ALLOWED; do
  if grep -qE "^${key}=1" "$PROD_ENV" 2>/dev/null; then
    ok "${key}=1 present"
  else
    note "${key} was missing — appending =1"
    grep -qE "^${key}=" "$PROD_ENV" 2>/dev/null && sed -i "s/^${key}=.*/${key}=1/" "$PROD_ENV" || echo "${key}=1" >>"$PROD_ENV"
    ok "${key}=1 configured"
  fi
done
bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null 2>&1 && ok "check-production-env-ready" || bad "check-production-env-ready"

echo "=== Phase C — Docker build and deploy ==="
note "CURRENT_PROD_SHADOW: $(cat ${RELEASES}/CURRENT_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"
note "PREVIOUS_PROD_SHADOW: $(cat ${RELEASES}/PREVIOUS_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"
[[ -f "$ARCHIVE" ]] || halt "archive missing: ${ARCHIVE}"

rm -rf "$BUILD_CTX"
mkdir -p "$BUILD_CTX"
tar -xzf "$ARCHIVE" -C "$BUILD_CTX"
grep -q start-preparing "$BUILD_CTX/artifacts/api-server/src/routes/orders.ts" || halt "archive lacks P17 routes"

cd "$BUILD_CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1
ok "built image ${TAG}"

SC="$(shadow_name)"
PREV_IMG="$(docker inspect "$SC" --format '{{.Config.Image}}' 2>/dev/null || true)"
[[ -n "$PREV_IMG" ]] && echo "$PREV_IMG" >"${RELEASES}/PREVIOUS_PROD_SHADOW_IMAGE"

export SOUQ_PROD_IMAGE="$TAG"
docker compose -f "$COMPOSE" up -d api-prod-shadow >>"$LOG" 2>&1
deadline=$((SECONDS + 180))
until curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null 2>&1; do
  (( SECONDS > deadline )) && halt "healthz :3002 timeout"
  sleep 2
done
echo "$TAG" >"${RELEASES}/CURRENT_PROD_SHADOW_IMAGE"
ok "prod-shadow up ${TAG}"

SC="$(shadow_name)"
docker exec "$SC" grep -q start-preparing /app/artifacts/api-server/dist/index.mjs || halt "dist missing start-preparing"

echo "=== Phase D — Route probes (:3002 + public) ==="
probe() {
  local url="$1"
  local code
  code=$(curl -s -o /tmp/p17probe.txt -w '%{http_code}' -X POST "$url" -H 'content-type: application/json' -d '{}')
  if grep -q 'Cannot POST' /tmp/p17probe.txt 2>/dev/null; then
    bad "Cannot POST $url"
    return 1
  fi
  ok "POST $url -> HTTP $code"
}

probe "http://127.0.0.1:3002/api/orders"
probe "http://127.0.0.1:3002/api/orders/SOUQ-2026-000099/accept"
probe "http://127.0.0.1:3002/api/orders/SOUQ-2026-000099/reject"
probe "http://127.0.0.1:3002/api/orders/SOUQ-2026-000099/cancel"
probe "http://127.0.0.1:3002/api/orders/SOUQ-2026-000099/start-preparing"
probe "http://127.0.0.1:3002/api/orders/SOUQ-2026-000099/mark-shipped"

probe "https://api.souq-arab.com/api/orders/SOUQ-2026-000099/start-preparing"

[[ "$FAIL" -eq 0 ]] || { echo "=== P17 PROD API: FAIL ==="; exit 1; }
echo "=== P17 PROD API DEPLOY: PASS (phases A-D) ==="
