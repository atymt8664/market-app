#!/usr/bin/env bash
# Validates required keys exist without printing values.
set -u
STAGING="/opt/souq-arab/config/api.env.staging"
REQUIRED=(DATABASE_URL SESSION_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY)
FAIL=0

[[ -f "$STAGING" ]] || { echo "MISSING file"; exit 1; }

for key in "${REQUIRED[@]}"; do
  if grep -qE "^${key}=.+$" "$STAGING" 2>/dev/null; then
    echo "OK ${key}"
  else
    echo "MISSING ${key}"
    FAIL=1
  fi
done

[[ "$FAIL" -eq 0 ]] && exit 0
exit 1
