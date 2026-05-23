#!/usr/bin/env bash
# Phase 3 verify — VPS production upstream + Railway fallback + staging regression.
set -u
BASE="/opt/souq-arab"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 3 verify ==="

bash "${BASE}/scripts/phase3-ensure-nginx-forwarded-proto.sh" && ok "nginx X-Forwarded-Proto https" || bad "nginx forwarded-proto"
grep -q '127.0.0.1:3002' /etc/nginx/sites-enabled/souq-api-ready.conf 2>/dev/null \
  && ok "nginx upstream production :3002" || bad "nginx not on :3002"

[[ -f /etc/souq/phase3-production-upstream-at.txt ]] && ok "phase3 marker" || bad "phase3 marker"

docker compose -f "${BASE}/phase7/docker-compose.production-shadow.yml" ps 2>/dev/null | grep -q 'Up' \
  && ok "production shadow container Up" || bad "production shadow down"

bash "${BASE}/scripts/phase7-prod-readonly-external.sh" && ok "Railway fallback (api.souq-arab.com)" || bad "Railway readonly"

curl -fsS http://127.0.0.1/api/healthz >/dev/null && ok "nginx /api/healthz" || bad "nginx healthz"

# Same upstream as public nginx (:3002); loopback :80 auth is rate-limited — full auth smoke on :3002.
if API_BASE=http://127.0.0.1:3002 bash "${BASE}/scripts/phase7-vps-prod-shadow-smoke.sh"; then
  ok "production API smoke (:3002, same upstream as nginx)"
else
  bad "production API smoke"
fi

grep -q "$STAGING_REF" "${BASE}/config/api.env.staging" 2>/dev/null \
  && ok "staging env file preserved" || bad "staging env file"
grep -q "$PROD_REF" "${BASE}/config/api.env.production" 2>/dev/null \
  && ok "production env file present" || bad "production env file"
grep -q "$STAGING_REF" "${BASE}/config/api.env.production" 2>/dev/null \
  && bad "staging ref in production env" || ok "no staging ref in production env"

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 3 VPS: PASS ===" && exit 0
echo "=== PHASE 3 VPS: FAIL ==="
exit 1
