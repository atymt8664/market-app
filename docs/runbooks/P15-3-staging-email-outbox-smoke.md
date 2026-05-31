# P15-3 — STAGING Email Outbox Smoke

**Environment:** STAGING only (`qkczposlooaldmsjfmun`). **Never** run against PRODUCTION.

**Authority:** [P15-background-jobs.md](../architecture/P15-background-jobs.md)

---

## Prerequisites

- STAGING `DATABASE_URL` in `.env.local` or `api.env.staging` (VPS)
- `JOB_QUEUE_ENABLED=1`
- `EMAIL_OUTBOX_ENABLED=1` (default when unset)
- `job-worker` process running on STAGING for live auth flows (signup / reset)

---

## Static validation

```bash
pnpm --filter @workspace/api-server run p15-3:validate
pnpm --filter @workspace/api-server run test
```

---

## Integrated smoke (dry-run, no Resend)

```bash
cd artifacts/api-server
JOB_QUEUE_ENABLED=1 EMAIL_OUTBOX_ENABLED=1 pnpm run p15-3:staging-smoke
```

**Expected:** `auth.otp` enqueued → completed (dry run), email metrics updated, graceful shutdown PASS.

---

## STAGING auth flow (manual)

1. Ensure `job-worker` is running with P15-3 image
2. Set on STAGING API container: `JOB_QUEUE_ENABLED=1`, `EMAIL_OUTBOX_ENABLED=1`
3. Signup or resend-verification → API returns success before Resend completes
4. Verify email arrives within ~60s via worker logs (`auth_otp_sent`)

---

## Rollback

1. Set `EMAIL_OUTBOX_ENABLED=0` on STAGING API → reverts to sync Resend in API process
2. Stop `job-worker` if no other queue jobs needed
3. No PRODUCTION impact (outbox gate requires STAGING ref)

---

## Out of scope (this wave)

- Notifications, push, reports, support, verification workers
- PRODUCTION deploy / cutover
