# P17-5 / P17-6 / P17-7 — Production deployment runbook

**Scope:** Buyer flow (P17-5), seller orders (P17-6), shipping workflow (P17-7).

**Environment refs (never mix):**

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` |

---

## Pre-deploy (local / CI)

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/souq run i18n:check
pnpm --filter @workspace/souq run p17-7:validate
pnpm --filter @workspace/api-server run p17-7:staging-flow
```

---

## 1. Production database (one-time)

Apply P17 schema on **PRODUCTION** ref only (explicit approval):

- Migration: `lib/db/migrations/020_p17_orders_schema.sql`
- Use approved prod migration path (never STAGING URL).

Verify tables exist: `orders`, `order_items`, `buyer_addresses`, `shipments`, etc.

---

## 2. Vercel (frontend) — P17-PROD-3

**Official Production frontend deploy (SSOT):** [P0-production-frontend-deploy.md](./P0-production-frontend-deploy.md) — implements [ADR-006](../architecture/adr/006-git-only-production-frontend-deploy.md).

```
git commit on main → git push origin main → Vercel Git Integration → Production
```

**Project:** `market-app-souq` (aliases `https://www.souq-arab.com`) — not `classified-marketplace`.

Set **Production** environment variables (Vercel dashboard — permanent, not shell-only):

| Variable | Value |
|----------|-------|
| `VITE_P17_BUY_NOW_ENABLED` | `1` |
| `VITE_P17_ORDERS_HUB_VISIBLE` | `1` |
| `VITE_P17_SELLER_ORDERS_ENABLED` | `1` |
| `VITE_P17_SHIPPING_ENABLED` | `1` |

After env change (Vite bakes `VITE_*` at build time): push to `main` or Redeploy the latest `main` commit from Vercel (Git-sourced).

**Deprecated — do not use for Production:**

- `node infra/hetzner/deploy/vercel-prod-deploy.mjs`
- `vercel deploy --prod --archive=tgz` from a developer machine
- `vercel deploy --prebuilt --prod` from a developer machine

See ADR-006 for Emergency exception rules (Mohamed approval only).

**Never:** deploy project `classified-marketplace` — production alias is `market-app-souq` only.

Post-deploy checks:

```bash
pnpm --filter @workspace/souq run p17-prod3:prod
pnpm --filter @workspace/souq run p17:prod
pnpm --filter @workspace/souq run p17:buy-now:prod
pnpm --filter @workspace/api-server run p17:prod-smoke   # requires PROD_TEST_* on VPS
pnpm --filter @workspace/souq run p17-7:visual   # local dev only
```

---

## 3. Hetzner VPS (API)

In `/opt/souq-arab/config/api.env` (**PRODUCTION** ref only):

| Variable | Value |
|----------|-------|
| `P17_ORDERS_API_ENABLED` | `1` |
| `P17_ORDERS_PRODUCTION_ALLOWED` | `1` |

Build and deploy (on VPS, from approved archive):

```bash
TAG="souq-api:p17-57-$(date -u +%Y%m%d)"
# extract repo archive to build context, then:
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" .
sudo bash /opt/souq-arab/scripts/deploy-api.sh --image "$TAG"
sudo bash /opt/souq-arab/scripts/verify-deploy.sh
```

Confirm routes exist:

- `POST /api/orders/:orderNumber/start-preparing` → not `Cannot POST`
- `POST /api/orders/:orderNumber/mark-shipped`

---

## 4. Production smoke (authenticated)

Set env (never commit):

- `PROD_TEST_BUYER_EMAIL`
- `PROD_TEST_BUYER_PASSWORD`
- `PROD_TEST_SELLER_EMAIL`
- `PROD_TEST_SELLER_PASSWORD`

```bash
cd artifacts/api-server
pnpm run p17:prod-smoke
```

Manual UI: https://www.souq-arab.com — buyer checkout, seller accept → preparing → shipped.

---

## Rollback

| Layer | Action |
|-------|--------|
| Frontend | Promote previous Vercel deployment (`dpl_*`) and/or `git revert` + push `main`; set `VITE_P17_*` to `0` or unset if needed |
| API | `rollback-api.sh` to `PREVIOUS_TAG` in `/opt/souq-arab/releases/` |
| API env | `P17_ORDERS_API_ENABLED=0` → mock GET / 503 POST |
| Data | No destructive rollback without explicit approval |
