# Souq Arab EU — VPS API deploy workflow (design)

**Status:** Ready for use at API cutover only — does not run automatically.

## Principles

- Develop and test **locally** first.
- Ship a **tagged Docker image** — never `scp` application source to the server.
- Secrets live only in `/opt/souq-arab/config/api.env` on the VPS (`chmod 600`).
- **PRODUCTION** Supabase ref only when you explicitly approve cutover (`nptfxtkedqndkgmrcntn`).
- Railway/Vercel/DNS stay unchanged until a separate approval.

## Flow

```
local: pnpm test → docker build → smoke image locally
     → push image to registry (your credentials, not in repo)
VPS:   deploy-api.sh --image REGISTRY/souq-api:TAG
     → verify-deploy.sh
     → on FAIL: rollback-api.sh
```

## Scripts (on VPS after sync)

| Script | Purpose |
|--------|---------|
| `deploy-api.sh` | Stop stub, pull tag, start production profile, health gate |
| `rollback-api.sh` | Revert to previous tag from `releases/` |
| `verify-deploy.sh` | `/healthz`, `/api/healthz`, `/api/readyz` — no secret output |

## Logs

- Deploy actions: `/var/log/souq-arab/deploy.log`
- API: `docker compose -f /opt/souq-arab/api/docker/docker-compose.yml logs api`
- Nginx: `/var/log/souq-arab/nginx-api-*.log`

## Before first production deploy

1. Fill `/opt/souq-arab/config/api.env` on the server (manual, never commit).
2. DNS + TLS approval (separate phase).
3. Stop readiness stub: `docker compose --profile readiness-stub down`.
