# Souq Arab EU — VPS API deploy workflow (design)

**Status:** Ready for use at API cutover only — does not run automatically.

## Principles

- Develop and test **locally** first.
- Ship a **tagged Docker image** — never `scp` application source to the server.
- Secrets live only in `/opt/souq-arab/config/` on the VPS (`chmod 600`).
- **STAGING** and **PRODUCTION** env files stay separate — never merge refs or credentials.
- **PRODUCTION** Supabase ref only when you explicitly approve cutover (`nptfxtkedqndkgmrcntn`).
- Railway/Vercel/DNS stay unchanged until a separate approval.

## Architecture (VPS loopback)

| Path | Port | Container | Env file | Serves public? |
|------|------|-----------|----------|----------------|
| Main API | `:3001` | `souq-arab-api-api-1` | `api.env` (often STAGING ref) | **No** |
| prod-shadow | `:3002` | `api-prod-shadow-api-prod-shadow-1` | `api.env.production` | **Yes** (via nginx) |
| Public HTTPS | `443` | nginx → `:3002` | — | `https://api.souq-arab.com` |

**Important:** `deploy-api.sh` alone updates `:3001` only. It does **not** complete a production **public** deploy.

## Production PUBLIC deploy (official entry point)

Use when user-facing API behavior must change on `https://api.souq-arab.com`:

```
local: pnpm test → docker build → smoke image locally
VPS:   sudo bash deploy-production-public-api.sh --image souq-api:TAG [--skip-pull]
     → on FAIL: rollback-api.sh + prod-shadow rollback (PREVIOUS_PROD_SHADOW_IMAGE)
```

This wrapper orchestrates (without merging STAGING/PRODUCTION env):

1. `check-production-env-ready.sh`
2. `deploy-api.sh` — `:3001` main container (unchanged role)
3. `phase8-release-deploy-prod-shadow.sh` — `:3002` prod-shadow sync
4. `verify-production-public-api.sh` — **mandatory** public HTTPS gate

## Partial deploy (main container only)

```
VPS:   deploy-api.sh --image souq-api:TAG
     → verify-deploy.sh   (loopback; warns on prod-shadow drift)
```

Use only when you intentionally update `:3001` (e.g. STAGING smokes on VPS). **Not sufficient** for public API cutover.

## Scripts (on VPS after sync)

| Script | Purpose |
|--------|---------|
| **`deploy-production-public-api.sh`** | **Official public production deploy** (wrapper) |
| **`verify-production-public-api.sh`** | Public HTTPS + prod-shadow parity gate |
| `deploy-api.sh` | `:3001` main container only — not a complete public deploy |
| `phase8-release-deploy-prod-shadow.sh` | `:3002` prod-shadow sync (+ public verify when script present) |
| `rollback-api.sh` | Revert `:3001` tag from `releases/PREVIOUS_TAG` |
| `verify-deploy.sh` | Loopback health + prod-shadow drift warning |
| `phase8-release-verify-external.sh` | External smoke (HTTP codes; supplemental) |

## Logs

- Deploy actions: `/var/log/souq-arab/deploy.log`
- API: `docker compose -f /opt/souq-arab/api/docker/docker-compose.yml logs api`
- prod-shadow: `docker compose -f /opt/souq-arab/phase7/docker-compose.production-shadow.yml logs api-prod-shadow`
- Nginx: `/var/log/souq-arab/nginx-api-*.log`

## Before first production deploy

1. Fill `/opt/souq-arab/config/api.env.production` on the server (manual, never commit).
2. DNS + TLS approval (separate phase).
3. Stop readiness stub: `docker compose --profile readiness-stub down`.

## Read-only public verify (no deploy)

```bash
sudo bash verify-production-public-api.sh
# or with expected tag:
sudo SOUQ_EXPECT_IMAGE=souq-api:TAG bash verify-production-public-api.sh TAG
```
