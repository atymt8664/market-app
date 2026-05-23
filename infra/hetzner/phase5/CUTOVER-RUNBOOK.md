# Cutover runbook (documentation only — do not execute without explicit approval)

## Preconditions

- Phase 4 STAGING shadow: deploy, smoke, rollback — all PASS
- Phase 5 baseline: latency, load, WS probe — recorded under `/var/log/souq-arab/baseline/`
- Production ref `nptfxtkedqndkgmrcntn` env prepared on VPS in **separate** `api.env.production` (never symlink until approval)
- DNS + TLS approval (separate phase)
- Railway/Vercel strategy approved (separate phase)

## STAGING vs PRODUCTION guards

- `use-staging-env.sh` refuses production ref in `api.env.staging`
- Before cutover: `grep nptfxtkedqndkgmrcntn /opt/souq-arab/config/api.env` must be intentional
- Never copy `api.env.staging` over production secrets

## Suggested cutover sequence (future)

1. Maintenance window announced
2. Final STAGING smoke + baseline snapshot
3. Build and tag production image locally; push registry
4. Fill `api.env` for production (manual on VPS, chmod 600)
5. `deploy-api.sh --image <prod-tag>` with health gate
6. `verify-deploy.sh` + production smoke (read-only scripts)
7. DNS swing only after health gate PASS
8. Monitor baseline + Sentry; rollback via `rollback-api.sh` if healthz fails

## Rollback

- `rollback-api.sh` restores `PREVIOUS_TAG` / stub mode
- No data migration in Phase 5 — DB cutover is a separate approved step

## Out of scope for this document

- Stopping Railway
- Vercel env changes
- Admin UI changes
