#!/usr/bin/env bash
# Production PUBLIC API verify — prod-shadow (:3002) must match releases and https://api.souq-arab.com.
# Read-only safe. No secrets logged. Does not deploy or mutate runtime.
set -u

BASE="/opt/souq-arab"
RELEASES="${BASE}/releases"
PUBLIC_BASE="${PUBLIC_API_BASE:-https://api.souq-arab.com}"
EXPECTED_IMAGE="${SOUQ_EXPECT_IMAGE:-${1:-}}"

FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
note() { printf '  NOTE %s\n' "$*"; }

nginx_public_uses_shadow=0
if grep -rq '127.0.0.1:3002' /etc/nginx/sites-enabled/ 2>/dev/null; then
  nginx_public_uses_shadow=1
  ok "nginx public upstream -> :3002 (prod-shadow)"
else
  note "nginx public upstream not :3002 — shadow parity checks relaxed"
fi

CURRENT_TAG=""
CURRENT_SHADOW=""
[[ -f "${RELEASES}/CURRENT_TAG" ]] && CURRENT_TAG="$(cat "${RELEASES}/CURRENT_TAG")"
[[ -f "${RELEASES}/CURRENT_PROD_SHADOW_IMAGE" ]] && CURRENT_SHADOW="$(cat "${RELEASES}/CURRENT_PROD_SHADOW_IMAGE")"

[[ -n "$CURRENT_TAG" ]] && ok "CURRENT_TAG=${CURRENT_TAG}" || bad "CURRENT_TAG missing"
[[ -n "$CURRENT_SHADOW" ]] && ok "CURRENT_PROD_SHADOW_IMAGE=${CURRENT_SHADOW}" || bad "CURRENT_PROD_SHADOW_IMAGE missing"

SHADOW_CONTAINER=""
SHADOW_CONTAINER="$(docker ps --format '{{.Names}}' 2>/dev/null | grep 'prod-shadow-api-prod-shadow' | head -1 || true)"
SHADOW_IMAGE=""
if [[ -n "$SHADOW_CONTAINER" ]]; then
  SHADOW_IMAGE="$(docker inspect "$SHADOW_CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || true)"
  ok "prod-shadow container: ${SHADOW_CONTAINER}"
else
  bad "prod-shadow container not running"
fi

if [[ "$nginx_public_uses_shadow" -eq 1 ]]; then
  if [[ -n "$CURRENT_TAG" && -n "$CURRENT_SHADOW" && "$CURRENT_TAG" != "$CURRENT_SHADOW" ]]; then
    bad "CURRENT_TAG (${CURRENT_TAG}) != CURRENT_PROD_SHADOW_IMAGE (${CURRENT_SHADOW}) — public API may serve stale image"
  elif [[ -n "$CURRENT_TAG" && -n "$CURRENT_SHADOW" ]]; then
    ok "CURRENT_TAG matches CURRENT_PROD_SHADOW_IMAGE"
  fi

  if [[ -n "$SHADOW_IMAGE" && -n "$CURRENT_SHADOW" && "$SHADOW_IMAGE" != "$CURRENT_SHADOW" ]]; then
    bad "prod-shadow container image (${SHADOW_IMAGE}) != CURRENT_PROD_SHADOW_IMAGE (${CURRENT_SHADOW})"
  elif [[ -n "$SHADOW_IMAGE" && -n "$CURRENT_SHADOW" ]]; then
    ok "prod-shadow container image matches CURRENT_PROD_SHADOW_IMAGE"
  fi
fi

if [[ -n "$EXPECTED_IMAGE" ]]; then
  [[ "$CURRENT_SHADOW" == "$EXPECTED_IMAGE" ]] && ok "CURRENT_PROD_SHADOW_IMAGE matches expected ${EXPECTED_IMAGE}" \
    || bad "CURRENT_PROD_SHADOW_IMAGE (${CURRENT_SHADOW:-none}) != expected ${EXPECTED_IMAGE}"
  [[ "$SHADOW_IMAGE" == "$EXPECTED_IMAGE" ]] && ok "prod-shadow container matches expected ${EXPECTED_IMAGE}" \
    || bad "prod-shadow container (${SHADOW_IMAGE:-none}) != expected ${EXPECTED_IMAGE}"
fi

PUBLIC_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${PUBLIC_BASE}/api/healthz" 2>/dev/null || echo 000)"
[[ "$PUBLIC_CODE" == "200" ]] && ok "public ${PUBLIC_BASE}/api/healthz (${PUBLIC_CODE})" || bad "public healthz (${PUBLIC_CODE})"

SHADOW_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3002/api/healthz" 2>/dev/null || echo 000)"
[[ "$SHADOW_CODE" == "200" ]] && ok ":3002 loopback healthz (${SHADOW_CODE})" || bad ":3002 healthz (${SHADOW_CODE})"

if [[ "$nginx_public_uses_shadow" -eq 1 && "$SHADOW_CODE" == "200" && "$PUBLIC_CODE" == "200" ]]; then
  PUBLIC_LIVEZ="$(curl -sS "${PUBLIC_BASE}/api/livez" 2>/dev/null || true)"
  SHADOW_LIVEZ="$(curl -sS "http://127.0.0.1:3002/api/livez" 2>/dev/null || true)"
  PUBLIC_BUILD="$(printf '%s' "$PUBLIC_LIVEZ" | sed -n 's/.*"build"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  SHADOW_BUILD="$(printf '%s' "$SHADOW_LIVEZ" | sed -n 's/.*"build"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -n "$PUBLIC_BUILD" && -n "$SHADOW_BUILD" ]]; then
    [[ "$PUBLIC_BUILD" == "$SHADOW_BUILD" ]] && ok "public livez build matches :3002 (${PUBLIC_BUILD})" \
      || bad "livez build mismatch public=${PUBLIC_BUILD} shadow=${SHADOW_BUILD}"
  else
    note "livez build field unavailable — skipping build parity"
  fi

  PUB_EXPOSE="$(curl -sSI -H 'Origin: https://www.souq-arab.com' "${PUBLIC_BASE}/api/ads?limit=1" 2>/dev/null | tr -d '\r' | grep -i '^access-control-expose-headers:' | head -1 || true)"
  SHADOW_EXPOSE="$(curl -sSI -H 'Origin: https://www.souq-arab.com' "http://127.0.0.1:3002/api/ads?limit=1" 2>/dev/null | tr -d '\r' | grep -i '^access-control-expose-headers:' | head -1 || true)"
  if [[ -n "$PUB_EXPOSE" && -n "$SHADOW_EXPOSE" ]]; then
    [[ "$PUB_EXPOSE" == "$SHADOW_EXPOSE" ]] && ok "public Access-Control-Expose-Headers matches :3002" \
      || bad "public vs :3002 CORS expose mismatch (nginx upstream drift)"
  else
    note "CORS expose header probe skipped (endpoint unavailable)"
  fi
fi

echo "=== verify-production-public-api ==="
if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
