#!/usr/bin/env bash
# Phase 7: preserve CDN X-Forwarded-Proto for Secure session cookies (http context map + proxy snippet).
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
BASE="${1:-/opt/souq-arab/phase7/snippets}"
MAP_SRC="${BASE}/souq-forwarded-proto-map.conf"
PROXY_SRC="${BASE}/souq-proxy-params-forwarded.conf"
MAP_DEST="/etc/nginx/conf.d/souq-forwarded-proto-map.conf"
PROXY_DEST="/etc/nginx/snippets/souq-proxy-params.conf"
[[ -f "$MAP_SRC" && -f "$PROXY_SRC" ]] || { echo "missing snippet files under $BASE"; exit 1; }
cp -a "$PROXY_DEST" "${PROXY_DEST}.bak.phase7-$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true
install -m 644 "$MAP_SRC" "$MAP_DEST"
install -m 644 "$PROXY_SRC" "$PROXY_DEST"
nginx -t
systemctl reload nginx
echo "OK nginx forwarded-proto fix (map in conf.d + proxy snippet)"
