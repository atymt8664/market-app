# P15-3C — STAGING Push Delivery Outbox Smoke

**Environment:** STAGING only (`qkczposlooaldmsjfmun`).

---

## Prerequisites

- STAGING `DATABASE_URL`
- `JOB_QUEUE_ENABLED=1`
- `PUSH_OUTBOX_ENABLED=1` (default when unset)
- `job-worker` running for live notification → push flows

---

## Commands

```bash
pnpm --filter @workspace/api-server run p15-3c:validate
JOB_QUEUE_ENABLED=1 PUSH_OUTBOX_ENABLED=1 pnpm --filter @workspace/api-server run p15-3c:staging-smoke
```

---

## Rollback

1. `PUSH_OUTBOX_ENABLED=0` on STAGING API → `schedulePushDelivery` inline restored
2. Legacy `push-worker.ts` + Redis LIST unchanged — still available when outbox disabled

---

## Out of scope

- Firebase / FCM / new Web Push features
- PRODUCTION cutover
- Decommissioning Redis LIST (future phase)
