#!/usr/bin/env bash
# Trigger rate-limit logs; verify localhost is not banned.
set -u
i=0
while [[ "$i" -lt 80 ]]; do
  i=$((i + 1))
  curl -s -o /dev/null -X POST -H "User-Agent: souq-f2b-smoke" "http://127.0.0.1/api/auth/login" || true
done
fail2ban-client status souq-nginx-limit 2>/dev/null | grep -E 'Currently banned|Total banned' || true
