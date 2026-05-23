#!/usr/bin/env bash
# Activate PRODUCTION env symlink — BLOCKED unless cutover explicitly approved.
set -euo pipefail

CONFIG="/opt/souq-arab/config"
PROD="${CONFIG}/api.env.production"
ACTIVE="${CONFIG}/api.env"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"

[[ -f "$PROD" ]] || { echo "Missing ${PROD} — copy from api.env.production.example" >&2; exit 1; }

if grep -q "$STAGING_REF" "$PROD" 2>/dev/null; then
  echo "REFUSE: staging ref ${STAGING_REF} in api.env.production" >&2
  exit 1
fi

if ! grep -q "$PROD_REF" "$PROD" 2>/dev/null; then
  echo "REFUSE: production ref ${PROD_REF} not found in api.env.production" >&2
  exit 1
fi

if [[ "${SOUQ_CUTOVER_APPROVED:-}" != "1" ]]; then
  echo "REFUSE: set SOUQ_CUTOVER_APPROVED=1 only during approved cutover window" >&2
  exit 1
fi

for key in DATABASE_URL SESSION_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  if ! grep -qE "^${key}=.+$" "$PROD" 2>/dev/null; then
    echo "REFUSE: ${key} empty in api.env.production" >&2
    exit 1
  fi
done

ln -sf api.env.production "$ACTIVE"
chmod 600 "$PROD"
echo "OK active production env -> api.env (cutover approved flag set)"
