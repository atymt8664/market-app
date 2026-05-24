#!/usr/bin/env bash
# P11 STAGING push smoke — loopback :3001, no secrets printed.
set -u

STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
BASE="${API_BASE:-http://127.0.0.1:3001}"
ENV_FILE="/opt/souq-arab/config/api.env.staging"
FAIL=0

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

grep -q "$STAGING_REF" "$ENV_FILE" || { echo "REFUSE staging ref"; exit 2; }
grep -q "$PROD_REF" "$ENV_FILE" && { echo "REFUSE production ref"; exit 2; }

echo "=== P11 STAGING push smoke (${BASE}) ==="

c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "/api/healthz" || bad "/api/healthz ($c)"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "/api/readyz ($c)" || bad "/api/readyz ($c)"
c=$(code "${BASE}/api/push/vapid-public-key"); [[ "$c" == "200" ]] && ok "/api/push/vapid-public-key" || bad "vapid ($c)"
grep -q '^VAPID_PUBLIC_KEY=.' "$ENV_FILE" && ok "VAPID_PUBLIC_KEY present" || bad "VAPID_PUBLIC_KEY missing"
grep -q '^REDIS_URL=.' "$ENV_FILE" && ok "REDIS_URL present" || bad "REDIS_URL missing"

c=$(code "${BASE}/api/push/status"); [[ "$c" == "401" ]] && ok "push/status auth guard" || bad "push/status ($c)"

read_env_key() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true
}
EMAIL="$(read_env_key STAGING_SMOKE_EMAIL)"
PASS="$(read_env_key STAGING_SMOKE_PASSWORD)"

if [[ -n "${EMAIL:-}" && -n "${PASS:-}" ]]; then
  JAR=$(mktemp)
  login_payload=$(SE="$EMAIL" SP="$PASS" python3 -c 'import json,os; print(json.dumps({"email":os.environ["SE"],"password":os.environ["SP"]}))')
  c=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'Content-Type: application/json' -H 'User-Agent: souq-p11-push-smoke' \
    -d "$login_payload" "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && ok "POST /api/auth/login" || bad "login ($c)"

  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/push/status")
  [[ "$c" == "200" ]] && ok "GET /api/push/status authed" || bad "push/status authed ($c)"

  CSRF="$(curl -s -b "$JAR" -c "$JAR" "${BASE}/api/auth/me" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -n "${CSRF:-}" ]]; then
    sub_payload='{"endpoint":"https://updates.push.services.mozilla.com/w/p11-smoke-test","keys":{"p256dh":"BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkr06VlFuL2k6dY7dQ8v8Y8Y8Y8Y8Y8Y8Y8Y8","auth":"tBHItJI5svbpez7KI4CCXg"}}'
    c=$(code -b "$JAR" -c "$JAR" -X POST -H 'Content-Type: application/json' -H "x-csrf-token: ${CSRF}" \
      -d "$sub_payload" "${BASE}/api/push/subscriptions")
    [[ "$c" == "201" || "$c" == "200" ]] && ok "POST /api/push/subscriptions ($c)" || bad "push/subscriptions ($c)"
    c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/push/status")
    body=$(curl -s -b "$JAR" -c "$JAR" "${BASE}/api/push/status")
    echo "$body" | grep -q '"subscribed":true' && ok "push status subscribed" || bad "push status not subscribed"
  else
    bad "csrf missing"
  fi
  rm -f "$JAR"
else
  bad "STAGING_SMOKE credentials missing"
fi

if docker ps --format '{{.Names}}' | grep -q push-worker; then
  ok "push-worker container running"
else
  bad "push-worker not running"
fi

if docker exec souq-arab-redis-spike-redis-1 redis-cli ping 2>/dev/null | grep -q PONG; then
  ok "redis loopback ping"
elif redis-cli -h 127.0.0.1 ping 2>/dev/null | grep -q PONG; then
  ok "redis loopback ping"
else
  bad "redis ping"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== SMOKE: PASS ==="
  exit 0
fi
echo "=== SMOKE: FAIL ==="
exit 1
