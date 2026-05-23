#!/usr/bin/env bash
# Extended STAGING shadow smoke — HTTP codes only, no secrets.
set -u
BASE="${API_BASE:-http://127.0.0.1}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

echo "=== Extended STAGING smoke ==="
for spec in \
  "GET:/api/healthz:200" \
  "GET:/api/readyz:200" \
  "GET:/api/categories:200" \
  "GET:/api/ads?limit=2:200" \
  "GET:/api/ads/featured:200" \
  "GET:/api/ads/favorites:401" \
  "GET:/api/conversations:401" \
  "POST:/api/reports:401" \
  "POST:/api/support/tickets:401" \
  "GET:/api/admin/me:401" \
  "POST:/api/auth/resend-verification:400" \
  "POST:/api/storage/uploads/ad-images:401"
do
  IFS=: read -r method path expect <<<"$spec"
  if [[ "$method" == "GET" ]]; then
    c=$(code "${BASE}${path}")
  else
    c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}${path}")
  fi
  if [[ "$c" == "$expect" ]]; then
    ok "${method} ${path} (${c})"
  else
    bad "${method} ${path} (got ${c}, want ${expect})"
  fi
done

read_env_key() {
  grep -E "^${1}=" /opt/souq-arab/config/api.env.staging 2>/dev/null | head -1 | cut -d= -f2- || true
}
SE="$(read_env_key STAGING_SMOKE_EMAIL)"
SP="$(read_env_key STAGING_SMOKE_PASSWORD)"
if [[ -n "${SE:-}" && -n "${SP:-}" ]]; then
  JAR=$(mktemp)
  c=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" \
    "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && ok "login (${c})" || bad "login (${c})"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/auth/me")
  [[ "$c" == "200" ]] && ok "auth/me (${c})" || bad "auth/me (${c})"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/ads/favorites")
  [[ "$c" == "200" ]] && ok "favorites authed (${c})" || bad "favorites authed (${c})"
  rm -f "$JAR"
else
  ok "login/favorites skipped (no STAGING_SMOKE_* in api.env.staging)"
fi

if docker compose -f /opt/souq-arab/api/docker/docker-compose.yml ps 2>/dev/null | grep -q 'api-1.*Up'; then
  ok "api container Up"
else
  bad "api container not Up"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== EXTENDED SMOKE: PASS ===" && exit 0
echo "=== EXTENDED SMOKE: FAIL ==="
exit 1
