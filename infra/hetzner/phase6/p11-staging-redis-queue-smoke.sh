#!/usr/bin/env bash
# P11 — Redis queue + inline fallback smoke on STAGING VPS (no secrets).
set -u
BASE="${API_BASE:-http://127.0.0.1:3001}"
ENV_FILE="/opt/souq-arab/config/api.env.staging"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

read_env_key() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true
}

EMAIL="$(read_env_key STAGING_SMOKE_EMAIL)"
PASS="$(read_env_key STAGING_SMOKE_PASSWORD)"
[[ -n "${EMAIL:-}" && -n "${PASS:-}" ]] || { echo "FAIL smoke creds"; exit 1; }

JAR=$(mktemp)
login_payload=$(SE="$EMAIL" SP="$PASS" python3 -c 'import json,os; print(json.dumps({"email":os.environ["SE"],"password":os.environ["SP"]}))')
curl -s -o /dev/null -c "$JAR" -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "$login_payload" "${BASE}/api/auth/login"
USER_ID="$(curl -s -b "$JAR" -c "$JAR" "${BASE}/api/auth/me" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p' | head -1)"
[[ -n "${USER_ID:-}" ]] || { echo "FAIL user id"; exit 1; }

QUEUE_KEY="souq:p11:push:delivery"
TEST_JOB=$(USER_ID="$USER_ID" python3 -c 'import json,os; print(json.dumps({"userId":int(os.environ["USER_ID"]),"notificationId":0,"type":"announcement.test","title":"P11 queue","body":"Redis smoke","entityType":None,"entityId":None}))')

BEFORE=$(docker exec souq-arab-redis-spike-redis-1 redis-cli LLEN "$QUEUE_KEY" 2>/dev/null || echo 0)
docker exec souq-arab-redis-spike-redis-1 redis-cli LPUSH "$QUEUE_KEY" "$TEST_JOB" >/dev/null
sleep 2
REMAIN=$(docker exec souq-arab-redis-spike-redis-1 redis-cli LLEN "$QUEUE_KEY" 2>/dev/null || echo 999)
[[ "$REMAIN" -le "$BEFORE" ]] && ok "push-worker consumed queue job" || bad "queue not consumed (len=$REMAIN)"

docker logs souq-arab-redis-spike-push-worker-1 2>&1 | grep -qi 'Push worker started' && ok "push-worker log active" || bad "push-worker log"

rm -f "$JAR"
[[ "$FAIL" -eq 0 ]] && { echo "=== REDIS QUEUE: PASS ==="; exit 0; }
echo "=== REDIS QUEUE: FAIL ==="
exit 1
