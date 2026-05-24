# Phase 7 — DANGEROUS SCRIPTS (P0)

**Do not run without explicit approval from Mohamed.**

| Script | Risk |
|--------|------|
| `phase7-execute-cutover.sh` | Production shadow / cutover on VPS |
| `phase7-apply.sh` | Applies phase7 bundle to VPS |
| `phase7-start-prod-shadow-only.sh` | Starts prod shadow container |
| `phase7-vercel-rewrite-vps.sh` | **Documentation only** — does not change Vercel; manual `vercel.json` edit still requires approval |

## Required env guard

All **cutover execution** scripts in this folder (and `phase5/phase5-api-cutover.sh`) require:

```bash
export SOUQ_CUTOVER_APPROVED=1   # only after Mohamed approves
```

Without it, scripts exit `99` immediately.

## Never run from this repo against PRODUCTION without

- STAGING verification complete
- Filled `api.env.production` on VPS (secrets stay on server only)
- Rollback plan (`rollback-api.sh`, `phase7-rollback-staging.sh`)

**Forbidden without approval:** DNS changes, SSL, Railway stop, Vercel rewrites.
