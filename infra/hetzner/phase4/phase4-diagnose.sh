#!/usr/bin/env bash
# Phase 4 readiness matrix — no secrets, no env values.
set -u
VPS_IP="${SOUQ_VPS_IP:-178.105.206.173}"
DOMAIN="${SOUQ_API_DOMAIN:-api.souq-arab.com}"
FAIL=0
pass() { printf '| %-28s | PASS | %s\n' "$1" "$2"; }
pend() { printf '| %-28s | PEND | %s\n' "$1" "$2"; }
fail() { printf '| %-28s | FAIL | %s\n' "$1" "$2"; FAIL=1; }

code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase4-diag' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 4 diagnose ==="
echo "| Gate                         | Status | Notes |"
echo "|------------------------------|--------|-------|"

c=$(code "https://${DOMAIN}/api/healthz")
[[ "$c" == "200" ]] && pass "Railway fallback HTTPS" "healthz ${c}" || fail "Railway fallback HTTPS" "healthz ${c}"

c=$(code "http://${VPS_IP}/api/healthz")
[[ "$c" == "200" ]] && pass "VPS HTTP edge" "healthz ${c}" || fail "VPS HTTP edge" "healthz ${c}"

if ss -tln 2>/dev/null | grep -q ':443 '; then
  pass "VPS TLS listener :443" "nginx/certbot"
else
  pend "VPS TLS listener :443" "await DNS -> VPS + certbot"
fi

if [[ -f /etc/nginx/sites-enabled/souq-api-public.conf ]]; then
  pass "nginx api public vhost" "souq-api-public.conf"
else
  pend "nginx api public vhost" "run phase4-prepare-api-https.sh"
fi

if [[ -f /opt/souq-arab/releases/PREVIOUS_TAG ]]; then
  pass "Rollback tag" "PREVIOUS_TAG present"
else
  fail "Rollback tag" "PREVIOUS_TAG missing"
fi

if docker compose -f /opt/souq-arab/api/docker/docker-compose.yml ps 2>/dev/null | grep -q 'Up'; then
  pass "API container" "staging shadow up"
else
  fail "API container" "not running"
fi

RESOLVED=""
command -v getent >/dev/null 2>&1 && RESOLVED="$(getent ahostsv4 "${DOMAIN}" 2>/dev/null | awk '{print $1; exit}' || true)"
if [[ "${RESOLVED}" == "${VPS_IP}" ]]; then
  pass "DNS api -> VPS" "${RESOLVED}"
else
  pend "DNS api -> VPS" "resolved=${RESOLVED:-unknown} (Railway OK)"
fi

echo ""
[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 4 DIAGNOSE: PASS (pending items are expected pre-cutover) ===" && exit 0
echo "=== PHASE 4 DIAGNOSE: FAIL ==="
exit 1
