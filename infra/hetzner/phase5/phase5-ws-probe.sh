#!/usr/bin/env bash
# WebSocket probe on STAGING — uses VPS smoke credentials only; no secret output.
set -u
# Staging API loopback (:3001). Nginx :80 may point at prod-shadow — override with API_BASE if needed.
BASE="${API_BASE:-http://127.0.0.1:3001}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 5 WebSocket probe ==="

read_env_key() {
  grep -E "^${1}=" /opt/souq-arab/config/api.env.staging 2>/dev/null | head -1 | cut -d= -f2- || true
}
SE="$(read_env_key STAGING_SMOKE_EMAIL)"
SP="$(read_env_key STAGING_SMOKE_PASSWORD)"

if [[ -z "${SE:-}" || -z "${SP:-}" ]]; then
  bad "STAGING_SMOKE_* missing"
  echo "=== WS PROBE: FAIL ==="
  exit 1
fi

if ! command -v websocat >/dev/null 2>&1; then
  bad "websocat not installed"
  echo "=== WS PROBE: FAIL ==="
  exit 1
fi

extract_session_cookie() {
  local jar="$1"
  local c
  c="$(grep $'\t'souq.sid$'\t' "$jar" 2>/dev/null | awk -F'\t' '{print $6"="$7}' | tail -1)"
  if [[ -z "${c:-}" ]]; then
    c="$(grep '^#HttpOnly' "$jar" 2>/dev/null | grep $'\t'souq.sid$'\t' | awk -F'\t' '{print $6"="$7}' | tail -1)"
  fi
  printf '%s' "$c"
}

REUSE_JAR=false
if [[ -n "${SOUQ_SMOKE_COOKIE_JAR:-}" && -f "${SOUQ_SMOKE_COOKIE_JAR}" ]]; then
  JAR="${SOUQ_SMOKE_COOKIE_JAR}"
  REUSE_JAR=true
else
  JAR=$(mktemp)
fi
if [[ "$REUSE_JAR" == "false" ]]; then
  trap 'rm -f "$JAR"' EXIT
  login_payload=$(SE="$SE" SP="$SP" python3 -c 'import json,os; print(json.dumps({"email":os.environ["SE"],"password":os.environ["SP"]}))')
  c=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'Content-Type: application/json' -H 'User-Agent: souq-phase5-ws' \
    -d "$login_payload" \
    "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && ok "login for ws (${c})" || { bad "login (${c})"; echo "=== WS PROBE: FAIL ==="; exit 1; }
else
  ok "reusing smoke session cookie jar (no extra login)"
fi

COOKIE="$(extract_session_cookie "$JAR")"
[[ -n "${COOKIE:-}" ]] && ok "session cookie present" || { bad "session cookie missing"; echo "=== WS PROBE: FAIL ==="; exit 1; }

if [[ -z "${WS_URL:-}" ]]; then
  hostport="${BASE#*://}"
  WS_URL="ws://${hostport}/api/ws"
fi

if printf '\n' | timeout 2 websocat -n1 "$WS_URL" 2>/dev/null | grep -q .; then
  bad "ws accepted without cookie"
else
  ok "ws unauthenticated blocked"
fi

REPLY=$(printf '{"type":"ping"}\n' | timeout 5 websocat -n1 --header="Cookie: ${COOKIE}" "$WS_URL" 2>/dev/null | head -1 || true)
if echo "$REPLY" | grep -q '"type":"pong"'; then
  ok "ws ping/pong"
elif [[ -n "${REPLY:-}" ]]; then
  ok "ws authed connected"
else
  bad "ws authed connect failed"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== WS PROBE: PASS ===" && exit 0
echo "=== WS PROBE: FAIL ==="
exit 1
