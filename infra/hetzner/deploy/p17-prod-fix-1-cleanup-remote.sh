#!/usr/bin/env bash
# P17-PROD-FIX-1 — Remove P17-PROD-2 E2E pollution from PRODUCTION DB only.
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_ENV="/opt/souq-arab/config/api.env.production"
LOG="/var/log/souq-arab/p17-prod-fix-1-cleanup.log"
SCRIPT="/tmp/p17-prod-fix-1-cleanup.mjs"
DRY_RUN="${DRY_RUN:-0}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
[[ -f "$SCRIPT" ]] || halt "missing cleanup script at ${SCRIPT}"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-PROD-FIX-1 cleanup start dry_run=${DRY_RUN} ==="

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"

SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
[[ -n "$SC" ]] || halt "prod-shadow container missing"

docker cp "$PROD_ENV" "${SC}:/tmp/p17-fix-cleanup.env" >/dev/null
docker cp "$SCRIPT" "${SC}:/app/artifacts/api-server/p17-prod-fix-1-cleanup.mjs" >/dev/null
docker exec -e "DRY_RUN=${DRY_RUN}" -e "P17_FIX_ENV=/tmp/p17-fix-cleanup.env" -w /app/artifacts/api-server "$SC" \
  node p17-prod-fix-1-cleanup.mjs | tee -a "$LOG"

log "=== P17-PROD-FIX-1 cleanup done ==="
