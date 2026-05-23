#!/usr/bin/env bash
# Full smoke against VPS production shadow (127.0.0.1:3002) — requires filled api.env.production.
set -u
BASE="${API_BASE:-http://127.0.0.1:3002}"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

# Production NODE_ENV sets Secure session cookies; loopback smoke must mimic HTTPS terminator.
HDR_HTTPS=(-H 'X-Forwarded-Proto: https')

echo "=== Phase 7 VPS production shadow smoke ==="

if ! bash /opt/souq-arab/scripts/check-production-env-ready.sh >/dev/null 2>&1; then
  echo "BLOCKED api.env.production not ready (fill keys manually on VPS)"
  echo "=== VPS PROD SHADOW SMOKE: BLOCKED ==="
  exit 2
fi

grep -q "$STAGING_REF" /opt/souq-arab/config/api.env.production 2>/dev/null && { echo "REFUSE staging ref in production env"; exit 1; }
grep -q "$PROD_REF" /opt/souq-arab/config/api.env.production 2>/dev/null || { echo "REFUSE production ref missing"; exit 1; }

for _ in $(seq 1 30); do
  code "${BASE}/api/healthz" | grep -q 200 && break
  sleep 2
done

c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "healthz" || bad "healthz ($c)"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "readyz ($c)" || bad "readyz ($c)"

read_env_key() { grep -E "^${1}=" /opt/souq-arab/config/api.env.production 2>/dev/null | head -1 | cut -d= -f2- || true; }
SE="$(read_env_key PROD_SMOKE_EMAIL)"
SP="$(read_env_key PROD_SMOKE_PASSWORD)"
[[ -z "$SE" ]] && SE="$(read_env_key STAGING_SMOKE_EMAIL)"
[[ -z "$SP" ]] && SP="$(read_env_key STAGING_SMOKE_PASSWORD)"

if [[ -n "${SE:-}" && -n "${SP:-}" ]]; then
  JAR=$(mktemp)
  HDR=$(mktemp)
  trap 'rm -f "$JAR" "$HDR"' RETURN
  c=000
  for _attempt in 1 2 3; do
    c=$(curl -s -D "$HDR" -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
      "${HDR_HTTPS[@]}" -H 'Content-Type: application/json' -H 'User-Agent: souq-phase7-vps' \
      -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" "${BASE}/api/auth/login" 2>/dev/null || echo 000)
    [[ "$c" == "200" ]] && break
    [[ "$c" == "429" ]] && sleep 45
  done
  [[ "$c" == "200" ]] && ok "login ($c)" || bad "login ($c)"
  COOKIE_HDR="$(grep -i '^set-cookie:.*souq\.sid' "$HDR" 2>/dev/null | head -1 | sed 's/^[Ss]et-[Cc]ookie: *//; s/;.*//')"
  [[ -z "${COOKIE_HDR:-}" ]] && COOKIE_HDR="$(awk '$6=="souq.sid" {print $6"="$7; exit}' "$JAR" 2>/dev/null)"
  AUTH=()
  [[ -n "${COOKIE_HDR:-}" ]] && AUTH=(-H "Cookie: ${COOKIE_HDR}")
  c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/auth/me"); [[ "$c" == "200" ]] && ok "auth/me ($c)" || bad "auth/me ($c)"
  c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/ads/favorites"); [[ "$c" == "200" ]] && ok "favorites ($c)" || bad "favorites ($c)"
  c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/conversations"); [[ "$c" == "200" ]] && ok "conversations ($c)" || bad "chat ($c)"
  CSRF="$(curl -s "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/auth/me" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -n "${CSRF:-}" ]]; then
    c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" -X POST -H "x-csrf-token: ${CSRF}" -H 'Content-Type: application/json' -d '{}' "${BASE}/api/storage/uploads/ad-images")
    [[ "$c" == "400" || "$c" == "415" ]] && ok "upload authed ($c)" || bad "upload ($c)"
  fi
  if [[ -n "${COOKIE_HDR:-}" ]] && command -v websocat >/dev/null 2>&1; then
    WS_HOST="${BASE#http://}"
    WS_HOST="${WS_HOST#https://}"
    WS_URL="ws://${WS_HOST}/api/ws"
    R=$(printf '{"type":"ping"}\n' | timeout 5 websocat -n1 --header="Cookie: ${COOKIE_HDR}" "$WS_URL" 2>/dev/null | head -1)
    echo "$R" | grep -qE 'pong|"type":"pong"' && ok "websocket ping/pong" || bad "websocket"
  fi
  rm -f "$JAR" "$HDR"
else
  ok "auth paths skipped (no PROD_SMOKE_* / STAGING_SMOKE_* on production env file)"
fi

c=$(code "${BASE}/api/admin/me"); [[ "$c" == "401" || "$c" == "403" ]] && ok "admin/me unauth ($c)" || bad "admin/me ($c)"

[[ "$FAIL" -eq 0 ]] && echo "=== VPS PROD SHADOW SMOKE: PASS ===" && exit 0
echo "=== VPS PROD SHADOW SMOKE: FAIL ==="
exit 1
