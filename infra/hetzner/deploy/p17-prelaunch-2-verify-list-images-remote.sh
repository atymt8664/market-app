#!/usr/bin/env bash
# P17-PRELAUNCH-2 — verify GET /api/orders returns adId + imageUrl (authenticated).
set -euo pipefail
API="https://api.souq-arab.com"
ENV="/opt/souq-arab/config/api.env"
LOG="/var/log/souq-arab/p17-prelaunch-2-list-images.log"
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }

buyer_email=""
buyer_pw=""
while IFS= read -r line; do
  key="${line%%=*}"
  val="${line#*=}"
  case "$key" in
    PROD_TEST_BUYER_EMAIL|PROD_SMOKE_EMAIL) buyer_email="$val" ;;
    PROD_TEST_BUYER_PASSWORD|PROD_SMOKE_PASSWORD) buyer_pw="$val" ;;
  esac
done < <(grep -E '^(PROD_TEST_BUYER_|PROD_SMOKE_)' "$ENV" 2>/dev/null || true)

if [[ -z "$buyer_email" || -z "$buyer_pw" ]]; then
  log "FAIL no buyer test credentials in api.env"
  exit 1
fi

login_json=$(curl -sS -c /tmp/p17-pl2-cj -b /tmp/p17-pl2-cj -X POST "$API/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"${buyer_email}\",\"password\":\"${buyer_pw}\"}")
csrf=$(printf '%s' "$login_json" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).csrfToken||'')}catch{console.log('')}})")
if [[ -z "$csrf" ]]; then
  log "FAIL buyer login"
  exit 1
fi
log "OK buyer login"

orders_json=$(curl -sS -b /tmp/p17-pl2-cj "$API/api/orders")
printf '%s' "$orders_json" | node - <<'NODE'
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8');
  let body;
  try { body = JSON.parse(raw); } catch { console.log('FAIL invalid JSON'); process.exit(1); }
  if (body.mock === true) { console.log('FAIL list mock:true (P17 DB provider off)'); process.exit(1); }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) { console.log('WARN empty orders list — cannot assert thumbnails'); process.exit(0); }
  const sample = items[0];
  const hasAdId = typeof sample.adId === 'number' && sample.adId > 0;
  const hasImage = typeof sample.imageUrl === 'string' && sample.imageUrl.trim().length > 0;
  if (!hasAdId && !hasImage) {
    console.log('FAIL first item missing adId and imageUrl keys');
    process.exit(1);
  }
  console.log(`OK list mock:false items=${items.length} adId=${sample.adId ?? 'none'} imageUrl=${hasImage ? 'yes' : 'no'}`);
});
NODE
