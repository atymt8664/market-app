# Cutover checklist (execute only after explicit approval)

## Before cutover window

- [ ] Phase 6 verify PASS on VPS (staging still active)
- [ ] Fill `/opt/souq-arab/config/api.env.production` manually (chmod 600) — ref `nptfxtkedqndkgmrcntn`
- [ ] `check-production-env-ready.sh` → all keys OK
- [ ] Build `souq-api:production-YYYYMMDD` image; push to registry
- [ ] DNS/TLS approval documented
- [ ] Vercel production env points to VPS API (separate approval)
- [ ] Rollback owner on-call; `PREVIOUS_TAG` verified

## Cutover window (ordered)

1. Final STAGING: `verify-phase5.sh` + baseline snapshot
2. Maintenance notice / read-only mode if applicable
3. `SOUQ_CUTOVER_APPROVED=1 bash use-production-env.sh`
4. `deploy-api.sh --image <production-tag>`
5. `verify-deploy.sh`
6. `phase6-prod-api-smoke-readonly.sh` (must not SKIP)
7. DNS swing (separate step)
8. Monitor Sentry + baseline for 30–60 min

## Rollback

- `rollback-api.sh` → previous tag or readiness-stub
- `use-staging-env.sh` if returning to shadow testing

## Never

- Copy `api.env.staging` into production file
- Run cutover without `SOUQ_CUTOVER_APPROVED=1`
- Stop Railway without separate approval
