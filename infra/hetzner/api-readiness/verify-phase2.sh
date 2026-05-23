#!/usr/bin/env bash
# Read-only + safe HTTP checks for Phase 2 (no secrets).
set -u

BASE="/opt/souq-arab"
FAIL=0

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 2 verify ==="

[[ -f /etc/souq/phase2-applied-at.txt ]] && ok "marker /etc/souq/phase2-applied-at.txt" || bad "marker missing"
[[ -f "${BASE}/api/docker/docker-compose.yml" ]] && ok "docker-compose.yml" || bad "docker-compose.yml"
[[ -f /etc/nginx/sites-enabled/souq-api-ready.conf ]] && ok "nginx souq-api-ready" || bad "nginx site"

echo "=== HTTP (local) ==="
curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1 && ok "/healthz (host)" || bad "/healthz"
curl -fsS http://127.0.0.1/readyz >/dev/null 2>&1 && ok "/readyz (nginx)" || bad "/readyz"
curl -fsS http://127.0.0.1:3001/api/healthz >/dev/null 2>&1 && ok "upstream :3001 /api/healthz" || bad "upstream healthz"
curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1 && ok "proxy /api/healthz" || bad "proxy /api/healthz"
curl -fsS http://127.0.0.1/api/readyz >/dev/null 2>&1 && ok "proxy /api/readyz" || bad "proxy /api/readyz"

echo "=== Docker ==="
if docker compose -f "${BASE}/api/docker/docker-compose.yml" --profile readiness-stub ps 2>/dev/null | grep -q 'Up'; then
  ok "readiness-stub running"
else
  bad "readiness-stub not running"
fi
if docker ps --filter "name=^souq-arab-api-api-1$" --filter "status=running" -q 2>/dev/null | grep -q .; then
  bad "production api container must NOT be running"
else
  ok "production api container not running"
fi

echo "=== Monitoring bind ==="
ss -tln 2>/dev/null | grep -q '127.0.0.1:9100' && ok "node-exporter 127.0.0.1:9100" || bad "node-exporter"
ss -tln 2>/dev/null | grep -q '127.0.0.1:8081' && ok "nginx stub_status 127.0.0.1:8081" || bad "nginx stub_status"
ss -tln 2>/dev/null | grep ':3001' | grep -q '127.0.0.1' && ok "api/stub bound to loopback" || bad "3001 not loopback"

echo "=== UFW (expect 22,80,443) ==="
ufw status 2>/dev/null | grep -q '80/tcp' && ok "ufw 80" || bad "ufw 80"
ufw status 2>/dev/null | grep -q '443/tcp' && ok "ufw 443" || bad "ufw 443"

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== RESULT: PASS ==="
  exit 0
fi
echo "=== RESULT: FAIL ==="
exit 1
