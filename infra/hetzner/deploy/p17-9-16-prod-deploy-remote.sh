#!/usr/bin/env bash
# P17-9-16 Wave A — Production API deploy (git → docker → deploy-api). No push-worker. No secrets logged.
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
PROD_ENV="${BASE}/config/api.env.production"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p17-9-16-prod.log"
TAG="${SOUQ_P17_9_16_IMAGE:-souq-api:p17-9-16-$(date -u +%Y%m%d)}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-9-16 Wave A start tag=${TAG} ==="
log "AUDIT CURRENT_TAG=$(cat ${BASE}/releases/CURRENT_TAG 2>/dev/null || echo none)"
log "AUDIT PREVIOUS_TAG=$(cat ${BASE}/releases/PREVIOUS_TAG 2>/dev/null || echo none)"

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1 || halt "check-production-env-ready failed"

log ">> git clone"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

for needle in \
  "account/unread-counters" \
  "admin-notifications" \
  "officialNotificationContent" \
  "notification.created" \
  "023_p17_9_2_notification_idempotency.sql" \
  "024_p17_9_7_admin_notifications.sql"; do
  grep -rq "$needle" "${GIT_DIR}/" || halt "P17-9 source missing in git: ${needle}"
done
log "SOURCE_OK P17-9 markers present"

log ">> sync build-context"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"

log ">> apply migrations 023/024"
bash "${CTX}/infra/hetzner/deploy/p17-9-16-prod-apply-migrations.sh" "$CTX" >>"$LOG" 2>&1

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1

docker run --rm "$TAG" sh -c 'grep -rq "unread-counters" /app/artifacts/api-server/dist/ || grep -rq "unread-counters" /app/artifacts/api-server/src/' \
  >>"$LOG" 2>&1 || halt "built image missing P17-9 unread-counters"

log ">> deploy-api.sh"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

log ">> prod-shadow sync"
export SOUQ_PROD_IMAGE="$TAG"
bash "${BASE}/scripts/phase8-release-deploy-prod-shadow.sh" >>"$LOG" 2>&1 || true
docker compose -f "${BASE}/phase7/docker-compose.production-shadow.yml" up -d --force-recreate api-prod-shadow >>"$LOG" 2>&1 || true
echo "$TAG" >"${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE" 2>/dev/null || true

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com/api/account/unread-counters")"
log "PROBE unread-counters unauth HTTP ${code}"
[[ "$code" == "401" ]] || halt "unread-counters expected 401 got ${code}"

code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "https://api.souq-arab.com/api/orders" -H 'content-type: application/json' -d '{}')"
log "PROBE orders POST HTTP ${code}"
[[ "$code" != "404" ]] || halt "orders route missing"

log "AUDIT_NEW CURRENT_TAG=$(cat ${BASE}/releases/CURRENT_TAG 2>/dev/null || echo none)"
log "=== P17-9-16 Wave A DEPLOY PASS tag=${TAG} ==="
