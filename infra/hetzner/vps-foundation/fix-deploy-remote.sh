#!/usr/bin/env bash
set -euo pipefail
SOUQ_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBvOzdDkWu694v2/vF87ppGoYGSZrm2ytdvwC3F01cFE souq-vps-new'
AUTH=/home/deploy/.ssh/authorized_keys
TS="$(date +%Y%m%d%H%M%S)"

echo '=== STEP 1 backup ==='
cp -a "$AUTH" "${AUTH}.bak-${TS}" 2>/dev/null || touch "$AUTH"
ls -la "${AUTH}.bak-${TS}" 2>/dev/null || ls -la "$AUTH"

echo '=== STEP 2 deploy authorized_keys (souq-vps-new only) ==='
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$SOUQ_PUB" > "$AUTH"
chown deploy:deploy "$AUTH"
chown deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 "$AUTH"
chown deploy:deploy /home/deploy
chmod 755 /home/deploy

echo '=== STEP 3 verify deploy ==='
ssh-keygen -lf "$AUTH"
namei -l "$AUTH" | tail -3

echo '=== STEP 4 remove temp key from root ==='
ROOT_AUTH=/root/.ssh/authorized_keys
if [[ -f "$ROOT_AUTH" ]]; then
  cp -a "$ROOT_AUTH" "${ROOT_AUTH}.bak-${TS}"
  grep -v 'souq-vps-new' "$ROOT_AUTH" > "${ROOT_AUTH}.tmp" || true
  mv "${ROOT_AUTH}.tmp" "$ROOT_AUTH"
  chmod 600 "$ROOT_AUTH"
  echo 'root fingerprints after:'
  ssh-keygen -lf "$ROOT_AUTH" 2>/dev/null || echo '(empty)'
fi

echo '=== DONE ==='
