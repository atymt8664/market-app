#!/usr/bin/env bash
# Validates production env keys exist — never prints values.
set -u
PROD="/opt/souq-arab/config/api.env.production"
REQUIRED=(DATABASE_URL SESSION_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY FRONTEND_URL APP_URL)
FAIL=0
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"

[[ -f "$PROD" ]] || { echo "MISSING file"; exit 1; }

if grep -q "$STAGING_REF" "$PROD" 2>/dev/null; then
  echo "REFUSE staging ref in production file"
  exit 1
fi

if ! grep -q "$PROD_REF" "$PROD" 2>/dev/null; then
  echo "WARN production ref ${PROD_REF} not found (verify before cutover)"
fi

for key in "${REQUIRED[@]}"; do
  if grep -qE "^${key}=.+$" "$PROD" 2>/dev/null; then
    echo "OK ${key}"
  else
    echo "EMPTY ${key}"
    FAIL=1
  fi
done

[[ "$FAIL" -eq 0 ]] && exit 0
exit 1
