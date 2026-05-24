#!/usr/bin/env bash
# Shared guard: STAGING VPS smoke must hit loopback :3001 only — never nginx :80 or prod-shadow :3002.
# Source from STAGING smoke scripts; do not use for production cutover / public HTTPS verify.
STAGING_SMOKE_TARGET_BASE="${STAGING_SMOKE_TARGET_BASE:-http://127.0.0.1:3001}"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_API_CONTAINER="${STAGING_API_CONTAINER:-souq-arab-api-api-1}"
ENV_STAGING="${SOUQ_STAGING_ENV_FILE:-/opt/souq-arab/config/api.env.staging}"

staging_smoke_fail() {
  echo "REFUSE: $*" >&2
  exit 1
}

staging_smoke_assert_env_file() {
  [[ -f "$ENV_STAGING" ]] || staging_smoke_fail "missing ${ENV_STAGING}"
  grep -q "$STAGING_REF" "$ENV_STAGING" 2>/dev/null || staging_smoke_fail "staging ref missing in api.env.staging"
  grep -q "$PROD_REF" "$ENV_STAGING" 2>/dev/null && staging_smoke_fail "production ref in staging env"
}

staging_smoke_assert_container_db_ref() {
  local url
  url="$(docker inspect "$STAGING_API_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
    | grep -E '^DATABASE_URL=' | head -1 || true)"
  [[ -n "$url" ]] || staging_smoke_fail "cannot read DATABASE_URL from ${STAGING_API_CONTAINER}"
  echo "$url" | grep -q "$STAGING_REF" || staging_smoke_fail "staging API container is not on STAGING ref"
  echo "$url" | grep -q "$PROD_REF" && staging_smoke_fail "staging API container leaks production ref"
}

staging_smoke_resolve_base() {
  local requested="${1:-}"
  if [[ -z "$requested" ]]; then
    STAGING_SMOKE_BASE="$STAGING_SMOKE_TARGET_BASE"
    return 0
  fi

  if echo "$requested" | grep -qE ':3002(/|$)|:3002$'; then
    staging_smoke_fail "API_BASE must not use prod-shadow :3002 (got: ${requested})"
  fi

  if echo "$requested" | grep -qE '^https?://127\.0\.0\.1(/|$)|^https?://127\.0\.0\.1$'; then
    staging_smoke_fail "API_BASE must not use nginx :80 — use ${STAGING_SMOKE_TARGET_BASE} (got: ${requested})"
  fi
  if echo "$requested" | grep -qE '^https?://localhost(/|$)|^https?://localhost$'; then
    staging_smoke_fail "API_BASE must not use localhost:80 — use ${STAGING_SMOKE_TARGET_BASE}"
  fi

  if echo "$requested" | grep -qE '^https://'; then
    staging_smoke_fail "STAGING smoke must use loopback ${STAGING_SMOKE_TARGET_BASE}, not public HTTPS (got: ${requested})"
  fi

  if echo "$requested" | grep -qE '^http://127\.0\.0\.1:3001'; then
    STAGING_SMOKE_BASE="$requested"
    return 0
  fi

  staging_smoke_fail "unsupported API_BASE for STAGING smoke (got: ${requested}) — use ${STAGING_SMOKE_TARGET_BASE}"
}

staging_smoke_ws_url() {
  local hostport="${STAGING_SMOKE_BASE#*://}"
  echo "ws://${hostport}/api/ws"
}

staging_smoke_guard() {
  staging_smoke_assert_env_file
  staging_smoke_assert_container_db_ref
  staging_smoke_resolve_base "${1:-}"
  export STAGING_SMOKE_BASE
}
