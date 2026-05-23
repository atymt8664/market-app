#!/usr/bin/env bash
# Document Vercel rewrite target for VPS API (run locally after vercel.json update).
# Traffic: Vercel /api/* -> VPS nginx :80 -> loopback :3001 production API.
set -u
VPS_API_BASE="${VPS_API_BASE:-http://178.105.206.173}"
echo "Vercel rewrite destination should be: ${VPS_API_BASE}/api/:path*"
echo "Railway remains available at api.souq-arab.com as fallback (do not stop)."
