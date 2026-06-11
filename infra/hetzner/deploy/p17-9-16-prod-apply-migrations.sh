#!/usr/bin/env bash
# P17-9-16 — apply migrations 023 + 024 on PRODUCTION DB only. No secret output.
set -euo pipefail

STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
ENV_FILE="/opt/souq-arab/config/api.env.production"
CTX="${1:-/opt/souq-arab/build-context}"
SQL023="${CTX}/lib/db/migrations/023_p17_9_2_notification_idempotency.sql"
SQL024="${CTX}/lib/db/migrations/024_p17_9_7_admin_notifications.sql"

[[ -f "$ENV_FILE" ]] || { echo "FAIL missing env"; exit 1; }
grep -q "$PROD_REF" "$ENV_FILE" || { echo "REFUSE production ref missing"; exit 2; }
grep -q "$STAGING_REF" "$ENV_FILE" && { echo "REFUSE staging ref in production env"; exit 2; }

DBURL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
[[ -n "$DBURL" ]] || { echo "FAIL DATABASE_URL missing"; exit 1; }

has_dedup="$(psql "$DBURL" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='dedup_key');" 2>/dev/null || echo f)"
has_admin="$(psql "$DBURL" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='admin_notifications');" 2>/dev/null || echo f)"

if [[ "$has_dedup" != "t" ]]; then
  [[ -f "$SQL023" ]] || { echo "FAIL missing $SQL023"; exit 1; }
  echo ">> apply 023_p17_9_2_notification_idempotency.sql"
  psql "$DBURL" -v ON_ERROR_STOP=1 -f "$SQL023"
else
  echo "OK 023 already applied (dedup_key present)"
fi

if [[ "$has_admin" != "t" ]]; then
  [[ -f "$SQL024" ]] || { echo "FAIL missing $SQL024"; exit 1; }
  echo ">> apply 024_p17_9_7_admin_notifications.sql"
  psql "$DBURL" -v ON_ERROR_STOP=1 -f "$SQL024"
else
  echo "OK 024 already applied (admin_notifications present)"
fi

echo "P17_9_16_PROD_MIGRATION_DONE"
