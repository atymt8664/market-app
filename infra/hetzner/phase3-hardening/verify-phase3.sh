#!/usr/bin/env bash
set -u
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 3 verify ==="

[[ -f /etc/souq/phase3-applied-at.txt ]] && ok "phase3 marker" || bad "phase3 marker"
[[ -f /etc/nginx/conf.d/souq-phase3-limits.conf ]] && ok "limit zones" || bad "limit zones"
[[ -f /etc/nginx/snippets/souq-security-headers.conf ]] && ok "security snippets" || bad "snippets"
nginx -t >/dev/null 2>&1 && ok "nginx -t" || bad "nginx -t"

echo "=== health (no regression) ==="
curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1 && ok "/healthz" || bad "/healthz"
curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1 && ok "/api/healthz" || bad "/api/healthz"

echo "=== security headers (sample) ==="
HDR="$(curl -fsSI -X POST -H 'User-Agent: souq-phase3-verify' http://127.0.0.1/api/auth/login 2>/dev/null || true)"
echo "$HDR" | grep -qi 'x-content-type-options: nosniff' && ok "X-Content-Type-Options" || bad "X-Content-Type-Options"
echo "$HDR" | grep -qi 'x-frame-options: deny' && ok "X-Frame-Options" || bad "X-Frame-Options"

echo "=== rate limit smoke (auth zone) ==="
CODE429=0
for i in $(seq 1 25); do
  c="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'User-Agent: souq-phase3-verify' http://127.0.0.1/api/auth/login 2>/dev/null || echo 000)"
  [[ "$c" == "429" ]] && CODE429=1 && break
done
[[ "$CODE429" -eq 1 ]] && ok "auth limit returns 429 under burst" || bad "auth limit 429 not observed"

echo "=== fail2ban ==="
fail2ban-client status souq-nginx-limit >/dev/null 2>&1 && ok "jail souq-nginx-limit" || bad "fail2ban jail"

echo "=== sysctl ==="
sysctl net.core.somaxconn 2>/dev/null | grep -q '4096' && ok "somaxconn" || bad "somaxconn"

echo "=== production api not running ==="
docker ps --filter "name=^souq-arab-api-api-1$" --filter "status=running" -q 2>/dev/null | grep -q . \
  && bad "production api running" || ok "production api not running"

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== RESULT: PASS ==="
  exit 0
fi
echo "=== RESULT: FAIL ==="
exit 1
