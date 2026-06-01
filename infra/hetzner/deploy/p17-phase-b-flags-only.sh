#!/usr/bin/env bash
PROD_ENV="/opt/souq-arab/config/api.env.production"
for key in P17_ORDERS_API_ENABLED P17_ORDERS_PRODUCTION_ALLOWED; do
  if grep -qE "^${key}=1" "$PROD_ENV" 2>/dev/null; then echo "OK ${key}=1"
  else echo "MISSING ${key}"; fi
done
