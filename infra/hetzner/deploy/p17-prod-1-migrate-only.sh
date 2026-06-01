#!/usr/bin/env bash
# P17-PROD-1 — PRODUCTION schema only (020_p17_orders_schema.sql). No API/flags/deploy.
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_ENV="/opt/souq-arab/config/api.env.production"
SQL_FILE="/tmp/020_p17_orders_schema.sql"
LOG="/var/log/souq-arab/p17-prod-1.log"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/var/backups/souq-arab/p17-prod-1-${TS}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"

install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-PROD-1 start ==="

# --- REF GATE 1: api.env.production ---
[[ -f "$PROD_ENV" ]] || halt "api.env.production missing"
grep -q "$STAGING_REF" "$PROD_ENV" 2>/dev/null && halt "STAGING ref in api.env.production"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing in api.env.production"
log "REF_GATE_1 OK (api.env.production)"

SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
[[ -n "$SC" ]] || halt "prod-shadow container not running"
log "prod_shadow_container=${SC}"

ref_gate_container() {
  local label="$1"
  docker exec "$SC" node -e "
const prod='${PROD_REF}';
const stg='${STAGING_REF}';
const u=process.env.DATABASE_URL||'';
if(!u.includes(prod)){ console.log('${label} REFUSE_PROD'); process.exit(3); }
if(u.includes(stg)){ console.log('${label} REFUSE_STAGING'); process.exit(4); }
console.log('${label} OK');
" | tee -a "$LOG" | grep -q "${label} OK"
}

write_pgurl_in_container() {
  docker exec "$SC" node -e "
const fs=require('fs');
const prod='${PROD_REF}';
const stg='${STAGING_REF}';
let u=process.env.DATABASE_URL||'';
if(!u.includes(prod)||u.includes(stg)) process.exit(3);
u=u.replace(/([?&])uselibpqcompat=[^&]*/gi,'').replace(/[?&]$/,'').replace(/\\?&/,'?');
fs.mkdirSync('/tmp/p17-prod-1',{recursive:true,mode:0o700});
fs.writeFileSync('/tmp/p17-prod-1/pgurl',u,{mode:0o600});
console.log('PGURL_FILE_OK');
" | grep -q 'PGURL_FILE_OK'
}

copy_pgurl_to_backup_dir() {
  docker cp "${SC}:/tmp/p17-prod-1/pgurl" "${BACKUP_DIR}/.pgurl"
  chmod 600 "${BACKUP_DIR}/.pgurl"
}

cleanup_container_pgurl() {
  docker exec "$SC" rm -rf /tmp/p17-prod-1 2>/dev/null || true
}

check_p17_tables() {
  docker exec "$SC" node -e "
const ref='${PROD_REF}';
const u=process.env.DATABASE_URL||'';
if(!u.includes(ref)){console.log('REFUSE');process.exit(3);}
const pg=require('pg');
const pool=new pg.Pool({connectionString:u,ssl:{rejectUnauthorized:false}});
const tables=['orders','order_items','order_status_history','buyer_addresses','shipments','shipment_events','order_issues'];
(async()=>{
  const r=await pool.query(\"select table_name from information_schema.tables where table_schema='public' and table_name = any(\$1)\",[tables]);
  const found=new Set(r.rows.map(x=>x.table_name));
  let missing=0;
  for(const t of tables){
    if(found.has(t)) console.log('OK '+t);
    else { console.log('MISSING '+t); missing++; }
  }
  await pool.end();
  process.exit(missing?1:0);
})().catch(e=>{console.log('ERR '+e.message);process.exit(2);});
"
}

# --- REF GATE 2 ---
ref_gate_container "REF_GATE_2" || halt "REF_GATE_2 failed"

[[ -f "$SQL_FILE" ]] || halt "missing ${SQL_FILE}"

# --- Pre-migration: expect all MISSING ---
log "PRE_TABLE_CHECK"
set +e
PRE_OUT="$(check_p17_tables 2>&1)"
PRE_RC=$?
set -e
echo "$PRE_OUT" | tee -a "$LOG"
if echo "$PRE_OUT" | grep -q '^OK orders'; then
  halt "P17 tables already exist on PRODUCTION"
fi
echo "$PRE_OUT" | grep -q '^MISSING orders' || halt "PRE_TABLE_CHECK unexpected"

# --- REF GATE 3 (before backup) ---
ref_gate_container "REF_GATE_3" || halt "REF_GATE_3 failed"

# --- Backup ---
install -d -m 0700 "$BACKUP_DIR"
write_pgurl_in_container || halt "pgurl prep failed"
copy_pgurl_to_backup_dir

docker run --rm \
  -v "${BACKUP_DIR}:/backup:rw" \
  postgres:16-bookworm \
  bash -c '
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq postgresql-client >/dev/null
URL=$(cat /backup/.pgurl)
pg_dump "$URL" --schema-only --no-owner --schema=public -f /backup/public-schema-pre-p17.sql
psql "$URL" -tAc "select count(*)::text from information_schema.tables where table_schema='"'"'public'"'"' and table_type='"'"'BASE TABLE'"'"';" > /backup/public_table_count_pre.txt
rm -f /backup/.pgurl
'

cleanup_container_pgurl
BACKUP_BYTES="$(wc -c < "${BACKUP_DIR}/public-schema-pre-p17.sql" | tr -d ' ')"
PRE_TABLE_COUNT="$(tr -d ' \n' < "${BACKUP_DIR}/public_table_count_pre.txt")"
[[ "$BACKUP_BYTES" -gt 1000 ]] || halt "backup file too small"
log "BACKUP_OK dir=${BACKUP_DIR} schema_bytes=${BACKUP_BYTES} public_tables_pre=${PRE_TABLE_COUNT}"

# --- REF GATE 4 (before migration) ---
ref_gate_container "REF_GATE_4" || halt "REF_GATE_4 failed"

write_pgurl_in_container || halt "pgurl prep for migrate failed"
copy_pgurl_to_backup_dir
cleanup_container_pgurl

docker run --rm \
  -v "${BACKUP_DIR}:/backup:rw" \
  -v "${SQL_FILE}:/migration.sql:ro" \
  postgres:16-bookworm \
  bash -c '
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq postgresql-client >/dev/null
URL=$(cat /backup/.pgurl)
psql "$URL" -v ON_ERROR_STOP=1 -f /migration.sql > /backup/migrate-psql.out 2>&1
rm -f /backup/.pgurl
' || halt "migration failed (see migrate-psql.out on VPS backup dir)"

grep -viE 'password|postgres://|postgresql://' "${BACKUP_DIR}/migrate-psql.out" | tail -15 >>"$LOG" 2>/dev/null || true
log "MIGRATION_OK"

# --- Post-migration: 7/7 ---
log "POST_TABLE_CHECK"
set +e
POST_OUT="$(check_p17_tables 2>&1)"
POST_RC=$?
set -e
echo "$POST_OUT" | tee -a "$LOG"
OK_COUNT="$(echo "$POST_OUT" | grep -c '^OK ' || true)"
[[ "$POST_RC" -eq 0 && "$OK_COUNT" -eq 7 ]] || halt "POST_TABLE_CHECK failed (${OK_COUNT}/7 OK)"

log "POST_TABLE_CHECK 7/7 OK"
log "=== P17-PROD-1 PASS ==="
exit 0
