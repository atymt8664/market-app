#!/usr/bin/env bash
# Phase 6 — VPS resource + edge snapshot (no secrets). Run on VPS as deploy user.
set -u
STAMP="${1:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="${SOUQ_MONITOR_DIR:-/var/log/souq-arab/monitor}"
OUT="${OUT_DIR}/snapshot-${STAMP}.txt"
mkdir -p "$OUT_DIR"

{
  echo "=== Souq Arab EU monitor snapshot ${STAMP} ==="
  echo "--- host ---"
  hostname
  date -u +"%Y-%m-%dT%H:%M:%SZ"
  uptime
  echo "--- memory ---"
  free -h
  echo "--- disk ---"
  df -h / /opt 2>/dev/null || df -h /
  echo "--- docker ---"
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "docker unavailable"
  echo "--- docker stats ---"
  docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>/dev/null | head -10
  echo "--- nginx upstream ---"
  sudo grep -A2 'upstream souq_api_public' /etc/nginx/sites-enabled/souq-api-public.conf 2>/dev/null || true
  echo "--- nginx stub_status ---"
  curl -s http://127.0.0.1:8081/nginx-status 2>/dev/null || echo "stub_status unavailable"
  echo "--- api health public ---"
  curl -s -o /dev/null -w 'healthz:%{http_code} time:%{time_total}s\n' https://api.souq-arab.com/api/healthz 2>/dev/null || true
  curl -s -o /dev/null -w 'readyz:%{http_code} time:%{time_total}s\n' https://api.souq-arab.com/api/readyz 2>/dev/null || true
  echo "--- active env symlink ---"
  readlink -f /opt/souq-arab/config/api.env 2>/dev/null || true
  echo "--- markers ---"
  ls -1 /etc/souq/*-at.txt 2>/dev/null || true
  echo "--- recent slow HTTP (api prod shadow) ---"
  sudo docker logs souq-arab-api-prod-shadow-api-prod-shadow-1 2>&1 | grep -i 'slow HTTP' | tail -5 || true
  echo "--- recent 5xx (api prod shadow) ---"
  sudo docker logs souq-arab-api-prod-shadow-api-prod-shadow-1 2>&1 | grep '"statusCode":5' | tail -8 || true
} >"$OUT" 2>&1

chmod 640 "$OUT" 2>/dev/null || true
echo "OK wrote ${OUT}"
wc -l "$OUT"
