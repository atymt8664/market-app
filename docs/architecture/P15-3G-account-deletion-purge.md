# P15-3G — Account Deletion Storage Purge & Cleanup Jobs

| Field | Value |
|-------|-------|
| **Code** | P15-3G |
| **Status** | ✅ Closed — STAGING `media.purge` outbox |
| **Authority** | [P15-background-jobs.md](./P15-background-jobs.md) |
| **Date** | 2026-05-31 |

---

## Executive decision

Migrate **account-deletion storage purge only** to pg-boss on STAGING (`media.purge`). All other delete paths remain **sync** or **DB-only** as today.

**No two-phase “mark for deletion”** — paths are collected **before** DB delete; purge runs after successful transaction (async on STAGING, sync on PRODUCTION).

**No cron scheduler** — purge is event-driven on `POST /account/delete`.

---

## Root cause

| # | Root cause | Fix |
|---|------------|-----|
| 1 | `removeUploadsObjectsByPaths()` runs in the **HTTP request thread** after account delete — unbounded IO at scale (thousands of images/messages) | STAGING: enqueue `media.purge` with pre-collected paths |
| 2 | GDPR / UX timeout risk when user has large media footprint | Worker processes batches of 80 paths with standard retry + DLQ |
| 3 | Verification document URLs not in purge path collection | Added `verification_request_documents` join in `collectUploadsPathsForUserAccount` |
| 4 | P15-3D deferred `media.purge` | Implemented in P15-3G per plan |

---

## Cleanup inventory

| Path | Route / Module | DB | Storage | Today | P15-3G |
|------|----------------|----|---------|-------|--------|
| **Delete account** | `POST /account/delete` | Transaction + FK cascades | Supabase purge | Sync best-effort | **STAGING async** |
| Delete user ad | `DELETE /ads/:adId` | Row delete | ❌ No cleanup | Sync DB | **Stay sync** (no storage purge) |
| Admin ad delete | Admin workflow | Row delete | ❌ No cleanup | Sync DB | **Stay sync** |
| Report workflow ad delete | Trust/safety | Row delete | ❌ No cleanup | Sync DB | **Stay sync** |
| Chat delete-for-everyone | Chat API | Soft delete | ❌ No cleanup | Sync DB | **Stay sync** |
| Push subscription delete | Push API | Row delete | N/A | Sync DB | **Stay sync** |
| Admin user ban | Admin | Session revoke | N/A | Sync | **Stay sync** |
| Notifications on user delete | FK cascade | Cascade delete | N/A | In account TX | **Stay sync** |
| Support attachments | — | N/A | Not implemented | — | N/A |
| Verification assets | Account purge | Cascade on user | URLs in `verification_request_documents` | **Gap fixed** | Included in path collection |

### Storage prefixes purged on account delete

| Prefix | Source |
|--------|--------|
| `avatars/{userId}/*` | `users.avatar_url` |
| `ads/{userId}/*` | `ads.images` JSON |
| `chat/{userId}/*` | `messages.image_url` (sender only) |
| Verification docs | `verification_request_documents.url` |

---

## Current delete architecture

```
POST /account/delete
  1. Validate password
  2. collectUploadsPathsForUserAccount(userId)   ← before DB delete
  3. deleteUserAccountInTransaction(userId)      ← DB + cascades
  4. routeAccountDeletionStoragePurge(userId, paths)
       STAGING + PURGE_OUTBOX_ENABLED:
         enqueue media.purge → worker → removeUploadsObjectsByPaths (batches of 80)
         on enqueue failure → sync fallback
       PRODUCTION (or gate off):
         runBestEffortStorageCleanupForUser (sync, unchanged)
  5. Session destroy → 200
```

**DB cascades on `users` delete (verified):** `ads`, `messages`, `verification_requests` (+ documents), `notifications`, sessions, etc.

---

## What stays sync

| Operation | Reason |
|-----------|--------|
| Single ad delete | Bounded; no storage cleanup today |
| Chat soft delete | No file removal |
| DB transaction on account delete | Must complete before response |
| PRODUCTION storage purge | No cutover in P15-3G |
| Push / notification / email deletes | Already migrated or N/A in prior phases |

---

## What moves async (STAGING only)

| Job | Trigger | Handler |
|-----|---------|---------|
| `media.purge` | Account deletion (immediate enqueue) | `executeAccountStoragePurge(paths)` |

**Env gate:** `JOB_QUEUE_ENABLED=1` + `PURGE_OUTBOX_ENABLED=1` (default on) + STAGING Supabase ref.

---

## Job definitions

```typescript
MEDIA_JOB_TYPES.PURGE = "media.purge"

Payload: {
  userId: number;
  paths: string[];
  trigger: "account_deletion" | "manual" | "smoke";
  dryRun?: boolean;  // STAGING smoke only — skips Supabase delete
}

Priority: normal (2)
Retry: STANDARD_RETRY_OPTIONS (5× exponential backoff)
DLQ: system.dead_letter
Idempotency: media.purge:account:{userId}
```

**No scheduler** — not cron-driven.

---

## Worker flow

```
routeAccountDeletionStoragePurge
  → startQueueModule()
  → enqueueMediaPurge(boss, { userId, paths, trigger: "account_deletion" })
  → pg-boss queue media.purge
  → handleMediaPurge
       dryRun (STAGING smoke) → metrics only
       else → removeUploadsObjectsByPaths(paths)
  → recordMediaPurgeResult + incrementMediaJobMetric
```

---

## Retry / DLQ flow

Same foundation as P15-3A–F:

1. Handler throws → pg-boss retries (5×, backoff)
2. Exhausted → job routed to `system.dead_letter`
3. Admin replay → P15-4 scope (not opened)

---

## Observability

- `collectQueueHealthSnapshot()` includes `mediaMetrics` (enqueued/processed/failed + last purge)
- Structured logs: `purge_outbox_enqueued`, `media_purge_completed`, `media_purge_dry_run`
- Queue depth via pg-boss `getQueueStats("media.purge")`

---

## Files

| File | Role |
|------|------|
| `src/lib/account-deletion.ts` | Path collection (+ verification docs), `executeAccountStoragePurge` |
| `src/lib/purge-outbox.ts` | STAGING gate + routing + enqueue fallback |
| `src/lib/jobs/handlers/media.ts` | Worker handler |
| `src/lib/jobs/media-types.ts` | Payload types |
| `src/routes/account.ts` | Wired to `routeAccountDeletionStoragePurge` |

---

## Verification

| Check | Command |
|-------|---------|
| Static validate | `npm run p15-3g:validate` |
| Unit tests | `npm test` (includes `purge-outbox.test.mjs`, registry 9 handlers) |
| STAGING smoke | `npm run p15-3g:staging-smoke` (dry run) |

---

## Rollback

1. Set `PURGE_OUTBOX_ENABLED=0` on STAGING → sync purge restored immediately
2. Revert commit → account route uses sync path only
3. Orphan storage files after failed purge: ops manual cleanup via Supabase dashboard (paths logged in job envelope — no secrets)

---

## Out of scope (documented gaps)

- Per-ad storage cleanup on `DELETE /ads/:id` (orphan files possible — future phase)
- Support attachment storage (not implemented)
- Production cutover
- P15-4 DLQ replay UI
