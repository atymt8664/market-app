#!/usr/bin/env bash
# Post-deploy checks — no env output.
# Loopback checks only. When nginx public upstream is :3002, also fail on prod-shadow drift.
set -u

BASE="/opt/souq-arab"
RELEASES="${BASE}/releases"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
note() { printf '  NOTE %s\n' "$*"; }

echo "=== Deploy verify (loopback) ==="
curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1 && ok "/healthz" || bad "/healthz"
curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1 && ok "/api/healthz" || bad "/api/healthz"
CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/readyz 2>/dev/null || echo 000)"
[[ "$CODE" == "200" || "$CODE" == "503" ]] && ok "/api/readyz (${CODE})" || bad "/api/readyz"
[[ -f "${RELEASES}/CURRENT_TAG" ]] && ok "CURRENT_TAG recorded" || bad "CURRENT_TAG"

if grep -rq '127.0.0.1:3002' /etc/nginx/sites-enabled/ 2>/dev/null; then
  note "nginx public upstream uses :3002 — checking prod-shadow release parity"
  CURRENT_TAG=""
  CURRENT_SHADOW=""
  [[ -f "${RELEASES}/CURRENT_TAG" ]] && CURRENT_TAG="$(cat "${RELEASES}/CURRENT_TAG")"
  [[ -f "${RELEASES}/CURRENT_PROD_SHADOW_IMAGE" ]] && CURRENT_SHADOW="$(cat "${RELEASES}/CURRENT_PROD_SHADOW_IMAGE")"
  if [[ -n "$CURRENT_TAG" && -n "$CURRENT_SHADOW" && "$CURRENT_TAG" != "$CURRENT_SHADOW" ]]; then
    bad "CURRENT_TAG (${CURRENT_TAG}) != CURRENT_PROD_SHADOW_IMAGE (${CURRENT_SHADOW}) — public API may be stale"
    note "run deploy-production-public-api.sh or phase8-release-deploy-prod-shadow.sh, then verify-production-public-api.sh"
  elif [[ -n "$CURRENT_TAG" && -n "$CURRENT_SHADOW" ]]; then
    ok "CURRENT_TAG matches CURRENT_PROD_SHADOW_IMAGE"
  else
    bad "missing CURRENT_PROD_SHADOW_IMAGE while nginx uses prod-shadow"
  fi
else
  note "nginx public upstream not :3002 — prod-shadow parity check skipped"
fi

note "verify-deploy.sh does NOT replace verify-production-public-api.sh (public HTTPS gate)"

if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
