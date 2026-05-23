#!/usr/bin/env bash
# Run on VPS after /opt/souq-arab/build-context.tgz is uploaded.
set -euo pipefail

TAG="${1:-souq-api:staging-shadow-$(date -u +%Y%m%d)}"
CTX="${2:-/opt/souq-arab/build-context}"
DOCKERFILE="${CTX}/infra/hetzner/api-readiness/docker/Dockerfile"
[[ -f "$DOCKERFILE" ]] || DOCKERFILE="${CTX}/infra/api-readiness/docker/Dockerfile"

[[ -f "$DOCKERFILE" ]] || { echo "Missing Dockerfile under ${CTX}/infra" >&2; exit 1; }

cd "$CTX"
echo "Building ${TAG} ..."
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" .
echo "OK ${TAG}"
