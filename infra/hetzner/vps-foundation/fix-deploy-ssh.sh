#!/usr/bin/env bash
# SSH only: fix deploy@ publickey auth. No app/docker/nginx changes.
set -euo pipefail

DEPLOY_USER="deploy"
AUTH_KEYS="/home/${DEPLOY_USER}/.ssh/authorized_keys"
SOUQ_VPS_FP="SHA256:4b9C/6UvB7befZR6n0atmLDLTCMyoBwTZIMUZEw/Od8"
SOUQ_VPS_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIeRd5u2QC+N7Dxpn6qnLeY7D5mLQg5j1xhunx56Bi82 souq-vps'

log() { printf '[fix-deploy-ssh] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

log "=== BEFORE (fingerprints only) ==="
if [[ -f "$AUTH_KEYS" ]]; then
  ssh-keygen -lf "$AUTH_KEYS" 2>/dev/null || log "authorized_keys: no valid key lines"
  wc -l "$AUTH_KEYS" | awk '{print "lines:", $1}'
  grep -q $'\r' "$AUTH_KEYS" && log "CRLF: YES" || log "CRLF: NO"
else
  log "MISSING: $AUTH_KEYS"
fi

log "=== FIX: normalize permissions (idempotent) ==="
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
touch "$AUTH_KEYS"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
chmod 700 "/home/${DEPLOY_USER}/.ssh"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/${DEPLOY_USER}"
chmod 755 "/home/${DEPLOY_USER}"

log "=== FIX: clean authorized_keys (CRLF + invalid lines) ==="
TMP="$(mktemp)"
tr -d '\r' < "$AUTH_KEYS" >"$TMP" || true
grep -E '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ssh-ed25519-cert-v01@openssh.com) ' "$TMP" >"${TMP}.clean" || true
mv "${TMP}.clean" "$AUTH_KEYS"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
rm -f "$TMP" "${TMP}.clean"

log "=== FIX: ensure souq-vps key present ==="
if ssh-keygen -lf "$AUTH_KEYS" 2>/dev/null | grep -qF "$SOUQ_VPS_FP"; then
  log "souq-vps fingerprint already present"
else
  log "appending souq-vps public key"
  echo "$SOUQ_VPS_PUB" >>"$AUTH_KEYS"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
  chmod 600 "$AUTH_KEYS"
fi

log "=== AFTER (fingerprints only) ==="
ssh-keygen -lf "$AUTH_KEYS"
namei -l "/home/${DEPLOY_USER}/.ssh/authorized_keys" | tail -3

log "DONE"
