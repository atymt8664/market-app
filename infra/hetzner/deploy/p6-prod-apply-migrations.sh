#!/usr/bin/env bash
# P6 — apply migrations 026–028 on PRODUCTION DB only. Idempotent.
set -euo pipefail

STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
ENV_FILE="/opt/souq-arab/config/api.env.production"
CTX="${1:-/opt/souq-arab/build-context}"
SQL026="${CTX}/lib/db/migrations/026_p6_user_2fa.sql"
SQL027="${CTX}/lib/db/migrations/027_p6_user_security_log.sql"
SQL028="${CTX}/lib/db/migrations/028_p6_privacy_activity_status.sql"

[[ -f "$ENV_FILE" ]] || { echo "FAIL missing env"; exit 1; }
grep -q "$PROD_REF" "$ENV_FILE" || { echo "REFUSE production ref missing"; exit 2; }
grep -q "$STAGING_REF" "$ENV_FILE" && { echo "REFUSE staging ref in production env"; exit 2; }

DBURL_RAW="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
[[ -n "$DBURL_RAW" ]] || { echo "FAIL DATABASE_URL missing"; exit 1; }
DBURL="$(printf '%s' "$DBURL_RAW" | sed -E 's/[?&]uselibpqcompat=[^&]*//g; s/\?&/?/g; s/&$//; s/\?$//')"

psql_q() {
  docker run --rm -i -e PGSSLMODE=require postgres:16-alpine psql "$DBURL" -tAc "$1"
}

psql_f() {
  docker run --rm -i -e PGSSLMODE=require -v "$(dirname "$1"):/sql:ro" postgres:16-alpine \
    psql "$DBURL" -v ON_ERROR_STOP=1 -f "/sql/$(basename "$1")"
}

has_totp="$(psql_q "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='totp_secret');" 2>/dev/null || echo f)"
has_log="$(psql_q "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_security_events');" 2>/dev/null || echo f)"
has_presence="$(psql_q "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='presence_activity_visible');" 2>/dev/null || echo f)"

if [[ "$has_totp" != "t" ]]; then
  [[ -f "$SQL026" ]] || { echo "FAIL missing $SQL026"; exit 1; }
  echo ">> apply 026_p6_user_2fa.sql"
  psql_f "$SQL026"
else
  echo "OK 026 already applied (totp_secret present)"
fi

if [[ "$has_log" != "t" ]]; then
  [[ -f "$SQL027" ]] || { echo "FAIL missing $SQL027"; exit 1; }
  echo ">> apply 027_p6_user_security_log.sql"
  psql_f "$SQL027"
else
  echo "OK 027 already applied (user_security_events present)"
fi

if [[ "$has_presence" != "t" ]]; then
  [[ -f "$SQL028" ]] || { echo "FAIL missing $SQL028"; exit 1; }
  echo ">> apply 028_p6_privacy_activity_status.sql"
  psql_f "$SQL028"
else
  echo "OK 028 already applied (presence_activity_visible present)"
fi

echo "P6_PROD_MIGRATION_DONE"
