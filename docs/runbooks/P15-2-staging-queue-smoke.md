# P15-2 — STAGING Queue Foundation Smoke

**Environment:** STAGING only (`qkczposlooaldmsjfmun`). **Never** run against PRODUCTION.

**Authority:** [P15-background-jobs.md](../architecture/P15-background-jobs.md)

---

## Prerequisites

- STAGING `DATABASE_URL` in `api.env.staging` (VPS) or `.env.local` (local)
- `JOB_QUEUE_ENABLED=1`
- `JOB_QUEUE_PRODUCTION_ALLOWED` must **not** be set for P15-2
- No Redis / BullMQ required

---

## Local / CI integrated smoke

```bash
cd artifacts/api-server
pnpm run build
JOB_QUEUE_ENABLED=1 pnpm run p15-2:staging-smoke
```

**Expected:** `system.ping` completes, `system.dlq_probe` fails after retries, graceful shutdown PASS.

---

## Static validation (no DB)

```bash
pnpm --filter @workspace/api-server run p15-2:validate
pnpm --filter @workspace/api-server run test
```

---

## VPS STAGING (loopback :3001 container)

1. Deploy API image containing `dist/worker/job-worker.mjs`
2. Optional: start job-worker profile:

   ```bash
   docker compose -f /opt/souq-arab/phase6/p15-2-docker-compose.job-worker.yml --profile job-worker up -d
   ```

3. Run smoke:

   ```bash
   bash /opt/souq-arab/infra/hetzner/deploy/p15-2-staging-job-worker-smoke.sh
   ```

---

## Rollback

1. Stop job-worker container: `docker compose ... down`
2. Set `JOB_QUEUE_ENABLED=0` or unset on STAGING API
3. pg-boss schema `pgboss` remains on STAGING DB — drop only with explicit STAGING approval:

   ```sql
   DROP SCHEMA IF EXISTS pgboss CASCADE;
   ```

---

## Out of scope (P15-2)

- Email / notification / OTP migration
- PRODUCTION deploy
- Redis / BullMQ
- Admin monitoring UI for queues
