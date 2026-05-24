#!/usr/bin/env bash
# STAGING only — compare login on staging API :3001 vs nginx :80 (no secrets).
set -u
ENV_FILE="/opt/souq-arab/config/api.env.staging"
SE="$(grep -E '^STAGING_SMOKE_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
SP="$(grep -E '^STAGING_SMOKE_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
payload=$(SE="$SE" SP="$SP" python3 -c 'import json,os; print(json.dumps({"email":os.environ["SE"],"password":os.environ["SP"]}))')

for base in http://127.0.0.1:3001 http://127.0.0.1; do
  c=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' -H 'User-Agent: souq-p5-port-check' \
    -d "$payload" "${base}/api/auth/login")
  echo "login_${base}=${c}"
done
