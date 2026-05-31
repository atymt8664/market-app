#!/usr/bin/env bash
set -euo pipefail
CID="$(docker ps -q --filter name=api-api-1 | head -1)"
[[ -n "$CID" ]] || exit 1
docker exec "$CID" node -p 'JSON.stringify({cores:require("os").cpus().length,load:require("os").loadavg()})'
