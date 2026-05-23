#!/usr/bin/env bash
# Post-deploy checks — no env output.
set -u
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Deploy verify ==="
curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1 && ok "/healthz" || bad "/healthz"
curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1 && ok "/api/healthz" || bad "/api/healthz"
CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/readyz 2>/dev/null || echo 000)"
[[ "$CODE" == "200" || "$CODE" == "503" ]] && ok "/api/readyz (${CODE})" || bad "/api/readyz"
[[ -f /opt/souq-arab/releases/CURRENT_TAG ]] && ok "CURRENT_TAG recorded" || bad "CURRENT_TAG"
[[ "$FAIL" -eq 0 ]] && echo "PASS" && exit 0
echo "FAIL"
exit 1
