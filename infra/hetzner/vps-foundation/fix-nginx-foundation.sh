#!/usr/bin/env bash
# Phase 1 only: resolve port 80 conflict and enable host nginx foundation.
# No API proxy, SSL, DNS, or secrets.
set -euo pipefail

HOSTIP="${HOSTIP:-178.105.206.173}"
WEB_ROOT="/var/www/souq-foundation/health"
SITE_AVAILABLE="/etc/nginx/sites-available/souq-foundation.conf"
SITE_ENABLED="/etc/nginx/sites-enabled/souq-foundation.conf"

log() { printf '[fix-nginx] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (or sudo)." >&2
  exit 1
fi

log "=== Before: port 80 ==="
docker ps -a 2>/dev/null || true
ss -tulpn | grep ':80' || true
systemctl is-active nginx 2>/dev/null || true

BEFORE_80="$(ss -tulpn | grep ':80' || true)"
NGINX_TEST_ID=""
NGINX_TEST_NAME=""
NGINX_TEST_ACTION="none"

if command -v docker >/dev/null 2>&1; then
  while IFS= read -r line; do
    cid="$(echo "$line" | awk '{print $1}')"
    cname="$(echo "$line" | awk '{print $NF}')"
    [[ -z "$cid" ]] && continue
    ports="$(docker port "$cid" 2>/dev/null || true)"
    if echo "$ports" | grep -q '0.0.0.0:80\|:::80\|\[::\]:80'; then
      if [[ "$cname" == *nginx-test* ]] || [[ "$cname" == "nginx-test" ]]; then
        NGINX_TEST_ID="$cid"
        NGINX_TEST_NAME="$cname"
        log "Stopping nginx-test container: $cname ($cid)"
        docker stop "$cid"
        log "Removing nginx-test container: $cname"
        docker rm "$cid"
        NGINX_TEST_ACTION="stopped_and_removed"
        break
      fi
    fi
  done < <(docker ps -a --format '{{.ID}} {{.Names}} {{.Ports}}' 2>/dev/null | grep -E '0\.0\.0\.0:80->|:::80->|\[::\]:80->' || true)

  if [[ -z "$NGINX_TEST_ID" ]]; then
    mapfile -t candidates < <(docker ps -a --format '{{.ID}} {{.Names}}' | grep -i nginx-test || true)
    if ((${#candidates[@]} > 0)); then
      cid="$(echo "${candidates[0]}" | awk '{print $1}')"
      cname="$(echo "${candidates[0]}" | awk '{print $2}')"
      if docker ps -a --format '{{.Names}} {{.Ports}}' | grep -q "^${cname} .*80"; then
        NGINX_TEST_ID="$cid"
        NGINX_TEST_NAME="$cname"
        docker stop "$cid" && docker rm "$cid"
        NGINX_TEST_ACTION="stopped_and_removed"
      fi
    fi
  fi
fi

log "=== Installing host nginx foundation config ==="
mkdir -p "$WEB_ROOT"
cat >"$WEB_ROOT/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Souq Arab EU VPS Foundation</title>
</head>
<body>
  <h1>Souq Arab EU VPS Foundation</h1>
  <p>Foundation host is ready. API deploy is not configured yet.</p>
</body>
</html>
EOF

cat >"$SITE_AVAILABLE" <<'EOF'
# Souq Arab EU — VPS foundation (Phase 1)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location = /healthz {
        default_type text/plain;
        return 200 'ok';
    }

    location / {
        root /var/www/souq-foundation/health;
        try_files $uri $uri/ =404;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf "$SITE_AVAILABLE" "$SITE_ENABLED"
nginx -t
systemctl enable nginx
systemctl restart nginx

log "=== After ==="
echo "--- systemctl nginx ---"
systemctl status nginx --no-pager -l | head -15 || true
echo "--- ss :80 ---"
ss -tulpn | grep ':80' || true
echo "--- curl local healthz ---"
curl -i http://127.0.0.1/healthz || true
echo "--- curl local / ---"
curl -i http://127.0.0.1/ | head -20 || true
echo "--- curl public healthz ---"
curl -i "http://${HOSTIP}/healthz" || true
echo "--- docker ps -a ---"
docker ps -a 2>/dev/null || true

log "BEFORE_PORT80_BEGIN"
printf '%s\n' "$BEFORE_80"
log "BEFORE_PORT80_END"
log "NGINX_TEST_ACTION=${NGINX_TEST_ACTION}"
log "NGINX_TEST_NAME=${NGINX_TEST_NAME:-none}"
log "DONE"
