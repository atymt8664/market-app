#!/usr/bin/env bash
# P8-1I — VPS environment isolation audit (no secret output).
set -u

BASE="/opt/souq-arab"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
FAIL=0

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
note() { printf '  NOTE %s\n' "$*"; }

ref_in_file() {
  local f="$1"
  local r="$2"
  grep -q "$r" "$f" 2>/dev/null
}

echo "=== P8-1I VPS environment isolation audit ==="

# Active symlink target
if [[ -L "${BASE}/config/api.env" ]]; then
  target="$(readlink -f "${BASE}/config/api.env")"
  note "api.env symlink -> $(basename "$target")"
  if ref_in_file "$target" "$STAGING_REF"; then
    note "api.env (active symlink) uses STAGING ref — expected for :3001 staging container"
  elif ref_in_file "$target" "$PROD_REF"; then
    note "api.env (active symlink) uses PRODUCTION ref"
  else
    bad "api.env ref unknown"
  fi
else
  bad "api.env is not a symlink"
fi

# Dedicated env files
if [[ -f "${BASE}/config/api.env.staging" ]]; then
  ref_in_file "${BASE}/config/api.env.staging" "$STAGING_REF" && ok "staging file has STAGING ref" || bad "staging file missing STAGING ref"
  ref_in_file "${BASE}/config/api.env.staging" "$PROD_REF" && bad "staging file leaks PRODUCTION ref" || true
else
  bad "staging file missing"
fi

if [[ -f "${BASE}/config/api.env.production" ]]; then
  ref_in_file "${BASE}/config/api.env.production" "$PROD_REF" && ok "production file has PRODUCTION ref" || bad "production file missing PRODUCTION ref"
  ref_in_file "${BASE}/config/api.env.production" "$STAGING_REF" && bad "production file leaks STAGING ref" || ok "production file clean of STAGING ref"
else
  bad "production file missing"
fi

# Nginx upstream (public traffic path)
NGINX_USES_SHADOW=0
if grep -rq '127.0.0.1:3002' /etc/nginx/sites-enabled/ 2>/dev/null; then
  NGINX_USES_SHADOW=1
  ok "nginx upstream -> :3002 (prod-shadow)"
elif grep -rq '127.0.0.1:3001' /etc/nginx/sites-enabled/ 2>/dev/null; then
  note "nginx upstream -> :3001 (staging primary — verify intentional)"
else
  bad "nginx upstream target unclear"
fi

# Container refs
main_ref="$(docker exec souq-arab-api-api-1 printenv SUPABASE_URL 2>/dev/null | sed -n 's|.*//\([^.]*\)\..*|\1|p' || true)"
shadow_ref="$(docker exec souq-arab-api-prod-shadow-api-prod-shadow-1 printenv SUPABASE_URL 2>/dev/null | sed -n 's|.*//\([^.]*\)\..*|\1|p' || true)"

[[ "$main_ref" == "$STAGING_REF" ]] && ok "main api :3001 -> STAGING ref" || bad "main api :3001 ref=${main_ref:-unknown}"
[[ "$shadow_ref" == "$PROD_REF" ]] && ok "prod-shadow :3002 -> PRODUCTION ref" || bad "prod-shadow :3002 ref=${shadow_ref:-unknown}"

main_img="$(docker inspect souq-arab-api-api-1 --format '{{.Config.Image}}' 2>/dev/null || true)"
shadow_img="$(docker inspect souq-arab-api-prod-shadow-api-prod-shadow-1 --format '{{.Config.Image}}' 2>/dev/null || true)"
note "main api image: ${main_img:-unknown}"
note "prod-shadow image: ${shadow_img:-unknown}"
if [[ "$main_img" == "$shadow_img" ]]; then
  ok "main + prod-shadow image parity"
elif [[ "$NGINX_USES_SHADOW" -eq 1 ]]; then
  bad "image mismatch with nginx on :3002 — public traffic may not match CURRENT_TAG (use deploy-production-public-api.sh)"
else
  note "image mismatch — nginx not on :3002"
fi

if [[ "$NGINX_USES_SHADOW" -eq 1 ]]; then
  CURRENT_TAG=""
  CURRENT_SHADOW=""
  [[ -f "${BASE}/releases/CURRENT_TAG" ]] && CURRENT_TAG="$(cat "${BASE}/releases/CURRENT_TAG")"
  [[ -f "${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE" ]] && CURRENT_SHADOW="$(cat "${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE")"
  if [[ -n "$CURRENT_TAG" && -n "$CURRENT_SHADOW" && "$CURRENT_TAG" != "$CURRENT_SHADOW" ]]; then
    bad "CURRENT_TAG (${CURRENT_TAG}) != CURRENT_PROD_SHADOW_IMAGE (${CURRENT_SHADOW})"
  elif [[ -n "$CURRENT_TAG" && -n "$CURRENT_SHADOW" ]]; then
    ok "release files: CURRENT_TAG matches CURRENT_PROD_SHADOW_IMAGE"
  fi
  if [[ -n "$shadow_img" && -n "$CURRENT_SHADOW" && "$shadow_img" != "$CURRENT_SHADOW" ]]; then
    bad "prod-shadow container image != CURRENT_PROD_SHADOW_IMAGE"
  elif [[ -n "$shadow_img" && -n "$CURRENT_SHADOW" ]]; then
    ok "prod-shadow container matches CURRENT_PROD_SHADOW_IMAGE"
  fi
fi

if docker exec souq-arab-api-prod-shadow-api-prod-shadow-1 grep -q buildNocCpuFromServerMetrics /app/artifacts/api-server/dist/index.mjs 2>/dev/null; then
  ok "prod-shadow dist has P8-1H NOC CPU hook"
else
  bad "prod-shadow dist missing P8-1H NOC CPU hook"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== P8-1I ENV ISOLATION AUDIT: PASS ==="
  exit 0
fi
echo "=== P8-1I ENV ISOLATION AUDIT: FAIL ==="
exit 1
