# Phase 1 — Production Stabilization (STAGING-only execution)

**Scope:** Code + STAGING verification prep. No Production Supabase, DNS, TLS, deploy, or commit from this doc alone.

## STAGING refs

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` — **do not touch in Phase 1 STAGING work** |

## Code changes (this phase)

| Item | Status | Notes |
|------|--------|-------|
| WebSocket fallback | Fixed | No Railway hardcode; same-origin default |
| PG pool | Fixed | `PG_POOL_MAX` env; default 30 prod / 10 dev |
| CI workflow | Added | `.github/workflows/ci.yml` |
| RLS audit SQL | Added | `scripts/verify-supabase-security-readiness.sql` |
| STAGING RLS/Storage verify | Added | `scripts/staging-phase1-supabase-verify.mjs` |
| user_blocks RLS (post-008) | Added | `lib/db/migrations/009_user_blocks_rls_lockdown.sql` |

## VPS STAGING checks (run on server — requires SSH)

```bash
sudo bash /opt/souq-arab/scripts/verify-phase5.sh
sudo bash /opt/souq-arab/scripts/phase5-ws-probe.sh
sudo bash /opt/souq-arab/scripts/phase4-staging-smoke.sh
sudo bash /opt/souq-arab/scripts/verify-deploy.sh
sudo cat /opt/souq-arab/releases/PREVIOUS_TAG
```

## Supabase STAGING (Dashboard)

1. SQL Editor → paste `scripts/verify-supabase-security-readiness.sql`
2. Confirm all app tables: `rls_enabled = true`
3. Confirm query (2) returns **zero rows**
4. Storage → bucket policies: service_role only for writes; public read per product policy

## TLS / DNS / Vercel rewrite (Production cutover — separate approval)

| Blocker | Current state | Fix when approved |
|---------|---------------|-------------------|
| Vercel rewrite | `http://178.105.206.173` in `vercel.json` | → `https://api.souq-arab.com` after TLS live |
| WS in browser | Same-origin via rewrite after cutover | Optional `VITE_WS_HTTP_ORIGIN` for staging VPS |
| Railway | Legacy fallback removed from code | Stop service after 48h VPS stability |

## Rollback

- VPS: `sudo bash /opt/souq-arab/scripts/rollback-api.sh`
- Code: revert WebSocket + pool commits if regression

## Phase 1 closure criteria (STAGING side)

- [x] Local/CI: typecheck + build + unit tests PASS (`node scripts/staging-phase1-local-verify.mjs`)
- [x] VPS STAGING: phase5 verify + ws-probe + phase4 smoke PASS (`deploy@178.105.206.173`, key `~/.ssh/id_ed25519`)
- [x] Supabase STAGING: RLS + storage verify PASS (`node scripts/staging-phase1-supabase-verify.mjs`)
- [x] Storage bucket `uploads-staging` + policies on STAGING (verified by supabase script)
- [x] `PREVIOUS_TAG` present on VPS

Production cutover (TLS, DNS, Vercel, Railway stop) remains **Phase 1 tail** requiring explicit approval — not STAGING-only.
