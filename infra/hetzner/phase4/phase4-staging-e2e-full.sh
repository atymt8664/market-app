#!/usr/bin/env bash
# Full STAGING E2E — HTTP codes only, no secret output.
set -u
BASE="${API_BASE:-http://127.0.0.1}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

read_env_key() {
  grep -E "^${1}=" /opt/souq-arab/config/api.env.staging 2>/dev/null | head -1 | cut -d= -f2- || true
}

extract_csrf() {
  curl -s -b "$1" -c "$1" "${BASE}/api/auth/me" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p' | head -1
}

extract_json_number() {
  echo "$1" | sed -n "s/.*\"${2}\":\([0-9][0-9]*\).*/\1/p" | head -1
}

echo "=== STAGING full E2E ==="

SE="$(read_env_key STAGING_SMOKE_EMAIL)"
SP="$(read_env_key STAGING_SMOKE_PASSWORD)"
if [[ -z "${SE:-}" || -z "${SP:-}" ]]; then
  bad "STAGING_SMOKE_* missing on VPS"
  echo "=== FULL E2E: FAIL ==="
  exit 1
fi

JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

c=$(code -c "$JAR" -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" "${BASE}/api/auth/login")
[[ "$c" == "200" ]] && ok "login ($c)" || { bad "login ($c)"; echo "=== FULL E2E: FAIL ==="; exit 1; }

CSRF="$(extract_csrf "$JAR")"
[[ -n "${CSRF:-}" ]] && ok "csrf token present" || { bad "csrf missing"; echo "=== FULL E2E: FAIL ==="; exit 1; }

c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/conversations")
[[ "$c" == "200" ]] && ok "GET conversations ($c)" || bad "conversations ($c)"

c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/notifications")
[[ "$c" == "200" ]] && ok "GET notifications ($c)" || bad "notifications ($c)"

CAT_JSON=$(curl -s -b "$JAR" "${BASE}/api/categories")
CAT_ID=$(extract_json_number "$CAT_JSON" "id")
if [[ -n "${CAT_ID:-}" ]]; then
  ok "category id resolved"
  AD_PAYLOAD=$(printf '{"title":"Staging smoke ad","description":"Automated staging E2E ad creation test.","price":10,"priceType":"fixed","type":"offer","categoryId":%s,"city":"Berlin","sellerName":"Smoke","sellerPhone":"+491234567890","images":[]}' "$CAT_ID")
  AD_RESP=$(curl -s -b "$JAR" -c "$JAR" -X POST -H 'Content-Type: application/json' -H "x-csrf-token: ${CSRF}" -d "$AD_PAYLOAD" "${BASE}/api/ads")
  AD_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -c "$JAR" -X POST -H 'Content-Type: application/json' -H "x-csrf-token: ${CSRF}" -d "$AD_PAYLOAD" "${BASE}/api/ads" 2>/dev/null || echo 000)
  [[ "$AD_CODE" == "201" ]] && ok "POST create ad ($AD_CODE)" || bad "create ad ($AD_CODE)"
  CREATED_AD_ID=$(extract_json_number "$AD_RESP" "id")
else
  bad "category id missing"
  CREATED_AD_ID=""
fi

c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/ads/mine")
[[ "$c" == "200" ]] && ok "GET ads/mine ($c)" || bad "ads/mine ($c)"

ADS_JSON=$(curl -s -b "$JAR" "${BASE}/api/ads?limit=5")
OTHER_AD_ID=""
while IFS= read -r line; do
  id=$(echo "$line" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p' | head -1)
  uid=$(echo "$line" | sed -n 's/.*"userId":\([0-9][0-9]*\).*/\1/p' | head -1)
  if [[ -n "${id:-}" && -n "${uid:-}" && "$id" != "${CREATED_AD_ID:-0}" ]]; then
    OTHER_AD_ID="$id"
    break
  fi
done < <(echo "$ADS_JSON" | tr '{' '\n' | grep '"id"')

if [[ -n "${OTHER_AD_ID:-}" ]]; then
  c=$(code -b "$JAR" -c "$JAR" -X POST -H "x-csrf-token: ${CSRF}" "${BASE}/api/ads/${OTHER_AD_ID}/favorite")
  [[ "$c" == "200" || "$c" == "201" ]] && ok "POST favorite ($c)" || bad "favorite ($c)"

  CONV_RESP=$(curl -s -b "$JAR" -c "$JAR" -X POST -H 'Content-Type: application/json' -H "x-csrf-token: ${CSRF}" \
    -d "{\"adId\":${OTHER_AD_ID}}" "${BASE}/api/conversations")
  CONV_ID=$(extract_json_number "$CONV_RESP" "id")
  if [[ -n "${CONV_ID:-}" ]]; then
    ok "POST conversation ($CONV_ID)"
    MSG_CODE=$(code -b "$JAR" -c "$JAR" -X POST -H 'Content-Type: application/json' -H "x-csrf-token: ${CSRF}" \
      -d '{"body":"Staging E2E chat message"}' "${BASE}/api/conversations/${CONV_ID}/messages")
    [[ "$MSG_CODE" == "201" || "$MSG_CODE" == "200" ]] && ok "POST chat message ($MSG_CODE)" || bad "chat message ($MSG_CODE)"
    c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/conversations/${CONV_ID}/messages")
    [[ "$c" == "200" ]] && ok "GET messages ($c)" || bad "messages ($c)"
  else
    bad "conversation create failed"
  fi
else
  ok "favorite/chat skipped (no other user ad in feed)"
fi

PNG=$(mktemp --suffix=.png)
# Valid 1x1 PNG (sharp/libspng-safe); previous minimal IDAT caused false 500 in smoke.
echo 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d >"$PNG"
UP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -c "$JAR" -X POST -H "x-csrf-token: ${CSRF}" \
  -F "images=@${PNG};type=image/png" "${BASE}/api/storage/uploads/ad-images" 2>/dev/null || echo 000)
[[ "$UP_CODE" == "200" || "$UP_CODE" == "201" ]] && ok "POST image upload ($UP_CODE)" || bad "image upload ($UP_CODE)"
rm -f "$PNG"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"not-an-email"}' "${BASE}/api/auth/resend-verification")
[[ "$c" == "400" || "$c" == "422" ]] && ok "OTP resend validation ($c)" || bad "OTP resend ($c)"

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/admin-login")
[[ "$c" == "400" || "$c" == "401" || "$c" == "403" ]] && ok "admin login unauthenticated ($c)" || bad "admin login ($c)"

if SOUQ_SMOKE_COOKIE_JAR="$JAR" /opt/souq-arab/scripts/phase5-ws-probe.sh 2>/dev/null | grep -q 'WS PROBE: PASS'; then
  ok "WebSocket ping/pong"
else
  bad "WebSocket ping/pong"
fi

grep -q qkczposlooaldmsjfmun /opt/souq-arab/config/api.env && ok "active env is staging ref" || bad "active env not staging"
grep -q nptfxtkedqndkgmrcntn /opt/souq-arab/config/api.env && bad "production ref in active env" || ok "production ref not in active env"

[[ "$FAIL" -eq 0 ]] && echo "=== FULL E2E: PASS ===" && exit 0
echo "=== FULL E2E: FAIL ==="
exit 1
