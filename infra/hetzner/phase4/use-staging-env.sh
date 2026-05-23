#!/usr/bin/env bash
# Activate STAGING env only — refuses production ref in DATABASE_URL host.
set -euo pipefail

CONFIG="/opt/souq-arab/config"
STAGING="${CONFIG}/api.env.staging"
ACTIVE="${CONFIG}/api.env"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"

[[ -f "$STAGING" ]] || { echo "Missing ${STAGING}" >&2; exit 1; }

if grep -q "$PROD_REF" "$STAGING" 2>/dev/null; then
  echo "REFUSE: production Supabase ref detected in api.env.staging" >&2
  exit 1
fi

if ! grep -q "$STAGING_REF" "$STAGING" 2>/dev/null; then
  echo "WARN: staging ref ${STAGING_REF} not found in DATABASE_URL/SUPABASE_URL (verify manually)" >&2
fi

ln -sf api.env.staging "$ACTIVE"
chmod 600 "$STAGING"
echo "OK active staging env -> api.env"
