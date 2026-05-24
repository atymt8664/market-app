# P15 — Background Jobs & Workers

| Field | Value |
|-------|-------|
| **Code** | P15 |
| **Status** | **Planned** — synchronous paths exist today |

---

## الهدف / Goal

**Asynchronous work** off the API request path: email batch, notification fan-out, image post-processing, search index refresh, expired-ad cleanup, and analytics rollups.

---

## المسؤوليات / Responsibilities

- Job queue design (BullMQ / pg-boss / equivalent)
- Worker processes on VPS (same host initially)
- Idempotent job handlers and dead-letter policy
- Scheduled cron tasks
- Migration of sync notification/email paths from API

---

## الملفات التابعة / Owned paths

| Current seeds | Future home |
|---------------|-------------|
| `lib/create-notification.ts` | Producer → queue |
| `lib/email.ts` | Email worker |
| `lib/normalize-ad-image.ts` | Image worker |
| (none yet) | `workers/` or `artifacts/worker/` package |

---

## ما المسموح تعديله / Allowed changes

- New worker package and queue wiring on STAGING
- Job schemas and retry policy

---

## ما الممنوع تعديله / Forbidden changes

- Breaking synchronous upload without worker fallback
- Wiring Redis queue without **P16** STAGING spike validation
- PRODUCTION worker deploy without approval

---

## Boundaries

- Workers **execute** tasks — do not add user-facing HTTP routes

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | VPS process supervision |
| **P1** | Env |
| **P4**, **P5** | Job payloads |
| **P14** | Index jobs |
| **P16** | Redis as queue backend (optional) |

---

## Owner scope

- **Primary:** Platform backend / **Developer E** coordination

---

## Scalability notes

| Volume | Approach |
|--------|----------|
| 1M notifications/day | Fan-out via queue, batch insert |
| Image thumbnails | Worker pool |
| Account deletion | Async GDPR job |

---

## Future roadmap

1. pg-boss or BullMQ on STAGING
2. Move `createNotification` to enqueue
3. Email + image workers
4. Cron: expired ads, rollup stats

---

## Testing requirements

- Job idempotency unit tests
- STAGING: enqueue → process → verify side effect
- Failure injection (retry, DLQ)

---

## Security notes

- Job payloads minimal — no secrets in queue messages
- Workers use service role carefully — least privilege

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `phase6/SCALE-ROADMAP.md` | Queue step in scale path |

---

## i18n namespace

Worker-internal strings: English logs only. User-facing results use owning P i18n.
