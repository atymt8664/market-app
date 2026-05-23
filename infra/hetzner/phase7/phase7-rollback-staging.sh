#!/usr/bin/env bash
# Rollback VPS to STAGING shadow — Railway untouched.
set -euo pipefail
BASE="/opt/souq-arab"
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
docker compose -f "${BASE}/phase7/docker-compose.production-shadow.yml" down 2>/dev/null || true
bash "${BASE}/scripts/use-staging-env.sh"
export SOUQ_API_IMAGE="souq-api:staging-shadow-20260520"
bash "${BASE}/scripts/deploy-api.sh" --image souq-api:staging-shadow-20260520 --skip-pull
bash "${BASE}/scripts/verify-deploy.sh"
bash "${BASE}/scripts/phase4-staging-smoke.sh"
echo "OK phase7 rollback staging"
