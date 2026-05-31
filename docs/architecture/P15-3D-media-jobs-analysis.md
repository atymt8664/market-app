# P15-3D — Media / Image Jobs Analysis

| Field | Value |
|-------|-------|
| **Code** | P15-3D |
| **Status** | ✅ Closed — **analysis + architectural decision** (no upload-path migration) |
| **Authority** | [P15-background-jobs.md](./P15-background-jobs.md) |
| **Date** | 2026-05-31 |

---

## Executive decision

**Do not migrate any media upload or serve path to pg-boss workers in P15-3D.**

Reason: every user-facing upload endpoint returns **final public URLs in the same HTTP response**. Moving Sharp normalize or Supabase upload off the request thread requires either (a) breaking the API contract / UX, or (b) blocking the API on job completion — which adds latency and complexity with no user benefit at current scale.

**Defer:**

| Item | Target phase | Why deferred |
|------|--------------|--------------|
| `media.normalize_ad` async worker | Future design wave (post P15-3D) | Requires two-phase upload (raw ACK → async normalize → URL swap) + UI processing state — forbidden in P15-3D |
| `media.purge` (account deletion) | **P15-3G** | Sync today; GDPR scale job — separate scope |
| Thumbnail generation | Not implemented | N/A |
| Storage provider change | — | Out of scope |

---

## Current media architecture

```
Client (Vercel)
    ↓ multipart
API (VPS) — multer memoryStorage
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Ad images     │ Sharp normalize │ Supabase Storage upload │
│ Avatar        │ (none)          │ Supabase Storage upload │
│ Chat images   │ (none)          │ Supabase Storage upload │
└─────────────────────────────────────────────────────────────┘
    ↓
{ imageUrls } / { imageUrl } in HTTP response (sync)

Serve (read):
  GET /storage/public-objects/*  → legacy GCS/Replit objectStorage (optional)
  GET /storage/objects/*         → private objects + ACL (auth)

Delete (write):
  account-deletion → removeUploadsObjectsByPaths (sync batches, best-effort)
```

**Primary storage:** Supabase Storage bucket (`SUPABASE_UPLOADS_BUCKET`, default `uploads`).

**Paths:**

| Prefix | Purpose |
|--------|---------|
| `ads/{userId}/{uuid}.jpg` | Listing images (normalized JPEG) |
| `avatars/{userId}/{uuid}.jpg` | Profile avatars (raw as uploaded) |
| `chat/{userId}/{uuid}.{ext}` | Chat attachments (jpeg/png/gif/webp) |

---

## Flow inventory (code-verified)

### 1. Ad image upload — **CPU + IO (sync)**

| Field | Value |
|-------|-------|
| Route | `POST /storage/uploads/ad-images` |
| File | `routes/storage.ts` → `uploadAdImagesForUser` |
| Processing | **Sharp** — rotate, resize max 1920px, JPEG q=83 |
| Limits | 10 files × 5MB multer |
| Response | `{ imageUrls: string[] }` — **final public URLs** |
| Moderation | None at upload (ad moderation is DB/status workflow) |

**Queue suitability:** Sharp is CPU-heavy but **bounded** (max 10 × 5MB). Async normalize is architecturally correct at **millions of ads/day** scale, but **cannot be wired** without two-phase upload contract — excluded from P15-3D.

### 2. Avatar upload — **IO only (sync)**

| Field | Value |
|-------|-------|
| Route | `POST /users/me/avatar` (users.ts) |
| Processing | None — raw buffer upload |
| Response | `{ success, imageUrl, avatarPendingReview }` |
| Moderation | **DB-only** — `avatar-moderation.ts` (pending review flags, no image ML) |

**Queue suitability:** Low. IO-bound; user waits for URL. Worker would delay response without benefit.

### 3. Chat image upload — **IO only (sync)**

| Field | Value |
|-------|-------|
| Route | conversations message image endpoint |
| Processing | None — raw upload |
| Response | `{ imageUrl }` |
| Trust | `isTrustedChatImagePublicUrlForUser` on send |

**Queue suitability:** Low. Same as avatar.

### 4. Storage serve — **must stay sync in API**

| Route | Role |
|-------|------|
| `GET /storage/public-objects/*` | Public asset proxy |
| `GET /storage/objects/*` | Authenticated private read |

Workers are inappropriate — user expects immediate stream/download.

### 5. Storage delete / cleanup — **IO batch (sync today)**

| Field | Value |
|-------|-------|
| Trigger | Account deletion |
| Function | `runBestEffortStorageCleanupForUser` → `removeUploadsObjectsByPaths` |
| Behavior | Batches of 80, best-effort, non-throwing |

**Queue suitability:** **High at GDPR scale** — unbounded loop risk. Scheduled for **P15-3G**, not P15-3D.

### 6. Thumbnail flow

**Not implemented.** No thumbnail generation in codebase.

### 7. Legacy object storage (GCS / Replit)

`lib/objectStorage.ts` — sidecar signing for Replit legacy. Not used for primary Supabase ad/avatar/chat uploads on VPS stack.

---

## What must stay sync (P15-3D conclusion)

| Path | Reason |
|------|--------|
| All upload endpoints | API contract returns final URLs in response |
| Storage GET/serve | User-facing read latency |
| Avatar moderation flags | DB logic only; no heavy work |
| Ad listing create/update | Uses pre-uploaded URLs; no inline Sharp |

---

## What should move async (future — not P15-3D)

| Job (planned) | Trigger | Priority | Prerequisite |
|---------------|---------|----------|--------------|
| `media.normalize_ad` | After raw upload ACK | normal (2) | Two-phase upload + optional UI processing state |
| `media.purge` | Account deletion | low | P15-3G |
| `media.thumbnail` | If product requires | normal | Product decision |

---

## Performance impact assessment (current)

| Operation | Bound | Event-loop impact |
|-----------|-------|-------------------|
| Ad Sharp normalize | ≤10 × 5MB input | **Moderate CPU** per request; acceptable at current volume |
| Supabase upload | Network IO | Dominates latency; worker does not remove round-trip from user ACK |
| Avatar/chat upload | Single file | Low |
| Storage delete on account | O(user assets) | **Risk at scale** — P15-3G |

**Verdict:** Upload path is **stable and correctly bounded** for STAGING/early production. Worker migration is **premature without contract evolution**.

---

## Root cause (why P15 doc listed normalize as gap)

| # | Root cause | P15-3D action |
|---|------------|---------------|
| 1 | P15-1 assumed async normalize with UI processing state | Not approved for P15-3D — UX/API frozen |
| 2 | Sharp runs inline in `uploadAdImagesForUser` | **Keep sync** until two-phase design |
| 3 | No pg-boss job for media yet | **Intentionally not added** — no safe wiring point |
| 4 | Account deletion purge sync | Defer **P15-3G** |

---

## P15-3D exit criteria (met)

- [x] Full upload/storage/delete flow inventory
- [x] CPU vs IO classification
- [x] Sync vs async recommendation with rationale
- [x] No API contract / UX / production behavior change
- [x] No storage provider change
- [x] Static validation script (`p15-3d:validate`)
- [x] Explicit deferral of worker wiring to future phase

---

## Rollback

N/A — no runtime migration in P15-3D. Documentation-only.

---

## Next phase gate (P15-3E+)

Before implementing `media.normalize_ad` worker:

1. Approved two-phase upload API design (raw store → job → final URL)
2. Frontend processing state (optional per P15 doc)
3. STAGING proof with real upload UX
4. Mohamed approval for production cutover

**Do not start P15-3E until P15-3D is closed.**
