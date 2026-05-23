#!/usr/bin/env bash
# Key presence only — never prints values.
set -u
F="/opt/souq-arab/config/api.env.staging"
for k in DATABASE_URL SESSION_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY RESEND_API_KEY STAGING_SMOKE_EMAIL STAGING_SMOKE_PASSWORD; do
  if grep -qE "^${k}=.+" "$F" 2>/dev/null; then
    echo "SET ${k}"
  else
    echo "EMPTY ${k}"
  fi
done
grep -q qkczposlooaldmsjfmun "$F" && echo REF_staging_present || echo REF_staging_absent
grep -q nptfxtkedqndkgmrcntn "$F" && echo REF_production_BLOCK || echo REF_production_absent
awk -F= '
  /^DATABASE_URL=|^SESSION_SECRET=|^SUPABASE_URL=|^SUPABASE_SERVICE_ROLE_KEY=/ {
    v=$2; gsub(/^["'\'' ]+|["'\'' ]+$/, "", v);
    if (length(v) > 8) print $1 "_len_ok";
    else print $1 "_len_empty";
  }
' "$F"
