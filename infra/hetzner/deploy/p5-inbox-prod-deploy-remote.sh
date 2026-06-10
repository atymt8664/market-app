#!/usr/bin/env bash
# P5 Messaging & Chat — Production API deploy. Run on VPS with sudo.
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
PROD_ENV="${BASE}/config/api.env.production"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p5-inbox-prod.log"
TAG="${SOUQ_P5_IMAGE:-souq-api:p5-messaging-$(date -u +%Y%m%d)}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P5 Inbox PROD start tag=${TAG} ==="

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1 || halt "check-production-env-ready failed"

log ">> git clone"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

grep -q listBlockedUsersForMe "${GIT_DIR}/artifacts/api-server/src/lib/list-blocked-users.ts" \
  || halt "P5 list-blocked-users missing"
grep -q '"/account/blocked-users"' "${GIT_DIR}/artifacts/api-server/src/routes/account.ts" \
  || halt "P5 account blocked-users route missing"
grep -q setMessageReaction "${GIT_DIR}/artifacts/api-server/src/routes/conversations.ts" \
  || halt "P5 message reaction route missing"
grep -q replyToMessageId "${GIT_DIR}/artifacts/api-server/src/routes/conversations.ts" \
  || halt "P5 quoted reply route missing"

log ">> sync build-context"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1
docker run --rm "$TAG" sh -c 'grep -q blocked-users /app/artifacts/api-server/dist/index.mjs' \
  >>"$LOG" 2>&1 || halt "dist missing blocked-users routes"

log ">> deploy-api.sh"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

log ">> prod-shadow sync (nginx public upstream :3002)"
export SOUQ_PROD_IMAGE="$TAG"
bash "${BASE}/scripts/phase8-release-deploy-prod-shadow.sh" >>"$LOG" 2>&1 || true
docker compose -f "${BASE}/phase7/docker-compose.production-shadow.yml" up -d --force-recreate api-prod-shadow >>"$LOG" 2>&1
echo "$TAG" >"${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE"

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

log "=== P5 Inbox PROD deploy OK tag=${TAG} ==="
