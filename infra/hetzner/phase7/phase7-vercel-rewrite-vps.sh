#!/usr/bin/env bash
# DOCUMENTATION ONLY — does not modify Vercel, DNS, or Production.
# Manual vercel.json changes require explicit approval from Mohamed.
# Traffic (when approved): Vercel /api/* -> VPS nginx :80 -> loopback :3001 production API.
set -u
echo "WARNING: This script only prints the intended rewrite target. It does not deploy or change Vercel." >&2
VPS_API_BASE="${VPS_API_BASE:-http://178.105.206.173}"
echo "Vercel rewrite destination should be: ${VPS_API_BASE}/api/:path*"
echo "Railway remains available at api.souq-arab.com as fallback (do not stop)."
