#!/usr/bin/env bash
# Phase 6 — full stabilization diagnose (VPS + public). No secret output.
set -u
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
warn() { printf '  WARN %s\n' "$*"; }

echo "=== Phase 6 stabilization diagnose ==="

# --- Vercel / HTTPS (repo + public) ---
if grep -q 'https://api.souq-arab.com/api/' /opt/souq-arab/build-context/artifacts/souq/vercel.json 2>/dev/null \
  || grep -q 'https://api.souq-arab.com/api/' /opt/souq-arab/build-context/vercel.json 2>/dev/null; then
  ok "vercel.json rewrite uses HTTPS API"
else
  warn "vercel.json HTTPS rewrite not verified in build-context (check deployed Vercel project)"
fi

c=$(curl -s -o /dev/null -w '%{http_code}' https://www.souq-arab.com/api/healthz 2>/dev/null || echo 000)
[[ "$c" == "200" ]] && ok "Vercel /api rewrite live (${c})" || bad "Vercel /api rewrite (${c})"

c=$(curl -s -o /dev/null -w '%{http_code}' http://api.souq-arab.com/api/healthz 2>/dev/null || echo 000)
[[ "$c" == "301" || "$c" == "308" ]] && ok "API HTTP redirects to HTTPS (${c})" || warn "API HTTP redirect (${c})"

# --- TLS / nginx ---
if [[ -f /etc/souq/phase4-https-live-at.txt ]]; then
  ok "phase4 HTTPS marker present"
else
  bad "phase4 HTTPS marker missing"
fi

if sudo ss -tlnp 2>/dev/null | grep -q ':443'; then
  ok "nginx :443 listening"
else
  bad "nginx :443 not listening"
fi

grep -q '127.0.0.1:3002' /etc/nginx/sites-enabled/souq-api-public.conf 2>/dev/null \
  && ok "public upstream -> production shadow :3002" \
  || bad "public upstream not :3002"

# --- Resend / email env (production file only, no values) ---
PROD_ENV="/opt/souq-arab/config/api.env.production"
if [[ -f "$PROD_ENV" ]]; then
  grep -q '^RESEND_API_KEY=.\+' "$PROD_ENV" && ok "RESEND_API_KEY set" || bad "RESEND_API_KEY missing"
  grep -q '^EMAIL_FROM=.\+' "$PROD_ENV" && ok "EMAIL_FROM set" || bad "EMAIL_FROM missing"
  grep -q '^FRONTEND_URL=https' "$PROD_ENV" && ok "FRONTEND_URL https" || bad "FRONTEND_URL missing or not https"
  grep -q 'nptfxtkedqndkgmrcntn' "$PROD_ENV" && ok "production Supabase ref" || bad "production ref missing"
  grep -q 'qkczposlooaldmsjfmun' "$PROD_ENV" && bad "staging ref in production env" || ok "no staging ref in production env"
else
  bad "api.env.production missing"
fi

# --- Containers ---
docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'prod-shadow' && ok "production shadow container" || bad "production shadow down"
REF=$(docker exec souq-arab-api-prod-shadow-api-prod-shadow-1 printenv SUPABASE_URL 2>/dev/null | sed -n 's|.*//\([^.]*\)\..*|\1|p')
[[ "$REF" == "nptfxtkedqndkgmrcntn" ]] && ok "prod shadow Supabase ref" || bad "prod shadow ref (${REF:-unknown})"

# --- forgot-password ---
if bash /opt/souq-arab/scripts/phase6-test-forgot-password-existing.sh 2>/dev/null | tail -1 | grep -qE 'HTTP:(200|502)'; then
  ok "forgot-password registered user"
else
  bad "forgot-password registered user (expected 200 or 502, not 500)"
fi

# --- Monitor snapshot ---
if bash /opt/souq-arab/scripts/phase6-vps-monitor-snapshot.sh >/dev/null 2>&1; then
  ok "monitor snapshot"
else
  warn "monitor snapshot script failed"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 6 DIAGNOSE: PASS ===" && exit 0
echo "=== PHASE 6 DIAGNOSE: FAIL ==="
exit 1
