# P15-3B — STAGING In-App Notification Outbox Smoke

**Environment:** STAGING only (`qkczposlooaldmsjfmun`).

---

## Prerequisites

- STAGING `DATABASE_URL`
- `JOB_QUEUE_ENABLED=1`
- `NOTIFICATION_OUTBOX_ENABLED=1` (default when unset)
- `job-worker` running for live auth/message flows

---

## Static validation

```bash
pnpm --filter @workspace/api-server run p15-3b:validate
pnpm --filter @workspace/api-server run test
```

---

## Integrated smoke (dry run)

```bash
cd artifacts/api-server
JOB_QUEUE_ENABLED=1 NOTIFICATION_OUTBOX_ENABLED=1 pnpm run p15-3b:staging-smoke
```

---

## Rollback

1. `NOTIFICATION_OUTBOX_ENABLED=0` on STAGING API → sync DB insert restored
2. No PRODUCTION impact (STAGING ref gate)

---

## Out of scope

- Push / Web Push / FCM migration
- Email changes
- PRODUCTION cutover
