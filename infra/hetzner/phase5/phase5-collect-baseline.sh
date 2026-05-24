#!/usr/bin/env bash
# STAGING VPS baseline snapshot — loopback :3001 only; aggregates only, no secrets.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/source-staging-smoke-guard.sh" ]]; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/source-staging-smoke-guard.sh"
elif [[ -f "${SCRIPT_DIR}/../_guards/source-staging-smoke-guard.sh" ]]; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/../_guards/source-staging-smoke-guard.sh"
else
  # shellcheck source=/dev/null
  source "/opt/souq-arab/scripts/source-staging-smoke-guard.sh"
fi
_souq_source_staging_smoke_guard "$SCRIPT_DIR"
staging_smoke_guard "${API_BASE:-}"
BASE="${STAGING_SMOKE_BASE}"

OUT_DIR="${BASELINE_OUT_DIR:-/var/log/souq-arab/baseline}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT_DIR}/baseline-${STAMP}.json"
mkdir -p "$OUT_DIR"

curl_ms() {
  curl -s -o /dev/null -w '%{time_total}' "$1" 2>/dev/null || echo "0"
}

hz_ms="$(curl_ms "${BASE}/api/healthz")"
rz_ms="$(curl_ms "${BASE}/api/readyz")"
cat_ms="$(curl_ms "${BASE}/api/categories?limit=5")"
lv_ms="$(curl_ms "${BASE}/api/livez")"

load1 load5 load15 _ < /proc/loadavg 2>/dev/null || load1=0 load5=0 load15=0
mem_avail_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
disk_use_pct="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}' 2>/dev/null || echo 0)"

api_cpu="" api_mem=""
if docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' 2>/dev/null | grep -q 'api-1'; then
  read -r _ api_cpu api_mem <<<"$(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' 2>/dev/null | grep 'api-1' | head -1)"
fi

ngx_err_5m=0
if [[ -f /var/log/souq-arab/nginx-api-error.log ]]; then
  ngx_err_5m="$(find /var/log/souq-arab/nginx-api-error.log -mmin -5 -printf '%s' 2>/dev/null | wc -c | tr -d ' ')"
fi

node_up=0
if curl -fsS --max-time 2 http://127.0.0.1:9100/metrics >/dev/null 2>&1; then
  node_up=1
fi

ref_ok=0 prod_block=0
if [[ -f /opt/souq-arab/config/api.env.staging ]]; then
  grep -q 'qkczposlooaldmsjfmun' /opt/souq-arab/config/api.env.staging && ref_ok=1
  grep -q 'nptfxtkedqndkgmrcntn' /opt/souq-arab/config/api.env.staging && prod_block=1
fi

current_tag="$(cat /opt/souq-arab/releases/CURRENT_TAG 2>/dev/null || echo unknown)"

printf '%s\n' "{
  \"collectedAt\": \"${STAMP}\",
  \"environment\": \"staging-vps-shadow\",
  \"smokeTargetBase\": \"${BASE}\",
  \"currentTag\": \"${current_tag}\",
  \"refGate\": { \"stagingPresent\": ${ref_ok}, \"productionBlocked\": ${prod_block} },
  \"latencySeconds\": {
    \"apiHealthz\": ${hz_ms},
    \"apiReadyz\": ${rz_ms},
    \"apiLivez\": ${lv_ms},
    \"apiCategories\": ${cat_ms}
  },
  \"host\": {
    \"load1\": ${load1},
    \"load5\": ${load5},
    \"load15\": ${load15},
    \"memAvailableKb\": ${mem_avail_kb},
    \"diskRootUsePct\": ${disk_use_pct}
  },
  \"dockerApi\": {
    \"cpuPercent\": \"${api_cpu:-n/a}\",
    \"memUsage\": \"${api_mem:-n/a}\"
  },
  \"nginxErrorLogBytesLast5m\": ${ngx_err_5m},
  \"nodeExporterLocal\": ${node_up}
}" >"$OUT"

echo "OK baseline ${OUT}"
