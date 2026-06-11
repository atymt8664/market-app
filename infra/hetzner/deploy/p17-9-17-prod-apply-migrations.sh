#!/usr/bin/env bash
# P17-9-17 — apply platform_broadcasts migration on PRODUCTION (025 only).
set -euo pipefail
CTX="${1:-/opt/souq-arab/build-context}"
PROD_REF="nptfxtkedqndkgmrcntn"
ENV_FILE="/opt/souq-arab/config/api.env.production"
SQL="${CTX}/lib/db/migrations/025_p17_9_17_platform_broadcasts.sql"

[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE"; exit 2; }
grep -q "$PROD_REF" "$ENV_FILE" || { echo "not production env"; exit 2; }
[[ -f "$SQL" ]] || { echo "missing migration 025"; exit 2; }

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
echo "P17-9-17 migration 025 applied"
