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

## 2. Vercel (frontend)

Set **Production** environment variables:

| Variable | Value |
|----------|-------|
| `VITE_P17_BUY_NOW_ENABLED` | `1` |
| `VITE_P17_ORDERS_HUB_VISIBLE` | `1` |
| `VITE_P17_SELLER_ORDERS_ENABLED` | `1` |
| `VITE_P17_SHIPPING_ENABLED` | `1` |

Redeploy `artifacts/souq` after `main` push (or trigger production deployment).

Post-deploy checks:

```bash
pnpm --filter @workspace/souq run p17:prod
pnpm --filter @workspace/souq run p17:buy-now:prod
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
| Frontend | Revert Vercel deployment; set `VITE_P17_*` to `0` or unset |
| API | `rollback-api.sh` to `PREVIOUS_TAG` in `/opt/souq-arab/releases/` |
| API env | `P17_ORDERS_API_ENABLED=0` → mock GET / 503 POST |
| Data | No destructive rollback without explicit approval |
