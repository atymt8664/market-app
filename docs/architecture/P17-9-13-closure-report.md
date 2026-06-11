# P17-9-13 — Push Notifications Production Closure Report

**Date:** 2026-06-11  
**Environment:** PRODUCTION (`nptfxtkedqndkgmrcntn`)  
**Status:** **OPEN / FAIL** — automated chain partial; device matrix pending Mohamed re-test after deploy  
**Authority:** [PROJECT_CONSTITUTION.md](../PROJECT_CONSTITUTION.md) · [P17-9-13 runbook](../runbooks/P17-9-13-push-device-verification.md)

---

## 1. Root Cause (per problem)

| # | Problem | Root cause |
|---|---------|------------|
| **Icon / status bar** | White square or generic glyph | Android Web Push `badge` must be a **monochrome white silhouette** on transparent PNG. Using full-color `pwa-icon-192.png` as `badge` renders as white square on Samsung/OneUI. Fix: dedicated `notification-badge-96.png` (SA monogram) + `notification-large-192.png` for drawer/lock screen `icon`. |
| **Lock screen** | Weak or missing heads-up | Web Push cannot set native `NotificationChannel` importance. Lock-screen visibility depends on: (a) user Android app notification settings, (b) `vibrate` + valid icons in `sw.js`, (c) Chrome site channel defaults. Payload title/body from server are shown; app name comes from PWA manifest `short_name` / notification title. |
| **Message push** | Messages not arriving outside app | (a) Server previously skipped push when WebSocket connected — Android keeps WS open in background, blocking all OS push. Fixed `delivery-policy.ts`. (b) No `message.received` producer before P17-9-13 — added `notifyMessageReceived` in `conversations.ts`. (c) **subscriptionCount = 0** on new devices — no OS permission/subscription until user manually visited settings. |
| **Permission flow** | User must find `/account/notifications` | No post-login opt-in. Only `PushNotificationsRegistrar` synced when permission already `granted`. Missing: in-app primer → `Notification.requestPermission()` → subscribe → DB. |
| **Unified system** | Per-type patches | Reports/broadcasts used `createNotification` pipeline; messages relied on WebSocket only. Now messages use same path: `createNotification` → `routePushDeliveryAfterNotification` → push-worker → webpush → SW → OS. |

---

## 2. What was fixed (this wave)

| Layer | Fix |
|-------|-----|
| **API** | `shouldSkipPushForConnectedUser` always `false`; structured skip logging; `notifyMessageReceived` → `message.received` notification + push fan-out |
| **SW** | Monochrome `badge` + brand `icon`; visibility gate (`!appVisible`); vibrate; dedup tags; cache v9 |
| **Assets** | `notification-badge.svg` SA monogram → PNG 24–96px; `notification-large-192.png` from logo master; build runs `icons:notification` |
| **Frontend** | `NotificationPermissionPrompt` — post-login opt-in (1.8s delay); OS permission → subscribe → `pushEnabled` in DB; denied → settings guidance |
| **Registrar** | Auto-sync subscription when OS permission granted but DB empty |
| **Validation** | `p17-9-13:validate` · `p17-9-13-push-chain-diagnose.mjs` · `p17-9-13-push-prod-verify.mjs` |

---

## 3. PWA / Chrome / Android limits (cannot fix without Native/FCM)

| Capability | Web Push / PWA | Native FCM + TWA APK |
|------------|----------------|----------------------|
| Status bar icon = full-color SA logo | **No** — only monochrome silhouette via `badge` | Yes — `default_notification_icon` in manifest |
| Custom `NotificationChannel` (importance, lock-screen bypass) | **No** | Yes |
| Rich images in notification | Limited / inconsistent on Android Web Push | Yes |
| Guaranteed heads-up on all OEMs | **No** — user + OEM settings | Higher control |
| App name in status bar | Site short name / Chrome label, not always “Souq Arab EU” | Full app label from APK |
| Background data without user-visible notification | **No** (`userVisibleOnly: true` required) | Yes with data messages |

**Production-grade best effort today:** monochrome SA monogram in status bar + full brand icon in drawer/lock screen + unified payload + permission opt-in.

---

## 4. Files modified

**API**
- `artifacts/api-server/src/lib/push/delivery-policy.ts`
- `artifacts/api-server/src/lib/push/push-delivery.ts`
- `artifacts/api-server/src/lib/message-notifications.ts`
- `artifacts/api-server/src/lib/message-notification-copy.ts`
- `artifacts/api-server/src/routes/conversations.ts`
- `artifacts/api-server/scripts/validate-p17-9-13-push.mjs`

**Frontend**
- `artifacts/souq/public/sw.js`
- `artifacts/souq/public/icons/notification-badge.svg` + PNG sizes
- `artifacts/souq/public/icons/notification-large-192.png`
- `artifacts/souq/scripts/generate-notification-badge.mjs`
- `artifacts/souq/src/components/notification-permission-prompt.tsx`
- `artifacts/souq/src/lib/push-permission-prompt.ts`
- `artifacts/souq/src/components/push-notifications-registrar.tsx`
- `artifacts/souq/src/components/layout.tsx`
- `artifacts/souq/src/i18n/locales/{ar,en,de}.json`

**Infra / docs**
- `infra/hetzner/deploy/p17-9-13-prod-deploy-remote.sh`
- `infra/hetzner/deploy/p17-9-13-push-chain-diagnose.mjs`
- `infra/hetzner/deploy/p17-9-13-push-prod-verify.mjs`
- `docs/runbooks/P17-9-13-push-device-verification.md`

---

## 5. Production deploy result

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend (Vercel)** | **Partial** | Production serves `sw.js` v8 + badge assets (chain: badge asset PASS). **v9 + permission prompt not deployed yet** — requires Vercel deploy after merge. |
| **API (Hetzner)** | **Pending verify** | Deploy script `p17-9-13-prod-deploy-remote.sh` targets `notifyMessageReceived` + delivery-policy. Confirm image tag on VPS after Mohamed-approved deploy. |
| **push-worker** | **Assumed running** | Prior P11/P15 stack; verify `push_delivered` logs after test event. |

**Deploy commands (after approval):**
```bash
# API (VPS)
sudo bash infra/hetzner/deploy/p17-9-13-prod-deploy-remote.sh

# Frontend — Vercel production from main after push
pnpm --filter @workspace/souq run build
```

---

## 6. Android device matrix

| Scenario | Expected | Mohamed device result |
|----------|----------|----------------------|
| Reports push | OS notification background/killed/lock | **Pending re-test** |
| Messages push | OS notification when not in thread | **Pending re-test** |
| Background | OS tray | **Pending** |
| App killed | OS tray | **Pending** |
| Lock screen | Heads-up with title + body + icon | **Pending** (v8 branding showed SA logo per evidence) |
| Deep link | Opens correct route | **Pending** |
| Permission flow | Prompt without visiting settings | **Pending** (code ready, needs deploy) |
| subscriptionCount > 0 | After opt-in | **Pending** |

Template: `infra/hetzner/deploy/p17-9-13-device-matrix.template.json`

---

## 7. Message push result

| Check | Result |
|-------|--------|
| Producer wired (`notifyMessageReceived`) | **PASS** (code + `p17-9-13:validate`) |
| `message.received` deep link `/messages/:id` | **PASS** (unit tests) |
| OS push on real device (background/killed/lock) | **PENDING** — requires deploy + subscription + device matrix |
| Not focused on same conversation | **PASS** (server gate via `isUserFocusedOnConversation`) |

---

## 8. Report push result

| Check | Result |
|-------|--------|
| P17-9-16 report resolution on production | **Closed** (prior milestone) |
| Broadcast / admin test push path | **PASS** (P17-9-17 verified) |
| OS push with subscription | **PENDING** device matrix |

---

## 9. Permission flow result

| Step | Result |
|------|--------|
| Login → in-app primer | **Implemented** — `NotificationPermissionPrompt` |
| User accept → OS permission | **Implemented** |
| Subscribe → DB | **Implemented** |
| `pushEnabled` sync | **Implemented** |
| Denied → settings hint | **Implemented** |
| Production verified on device | **FAIL / PENDING** — not deployed |

---

## 10. Icon / branding result

| Surface | Web Push best effort | Production (2026-06-11) |
|---------|---------------------|-------------------------|
| Status bar | Monochrome SA monogram (`notification-badge-96.png`) | Evidence: SA logo visible after v8 deploy |
| Notification drawer | `notification-large-192.png` | Same |
| Lock screen large icon | Same as drawer `icon` | Same |
| Full-color SA in status bar | **Not possible** on Web Push | N/A |

---

## 11. Lock screen result

- **Payload:** title + body from `buildPushNotificationPayload` / message copy  
- **Branding:** large icon + monochrome badge  
- **Limitation:** channel importance = user Android settings; Web Push cannot force “public” lock screen  
- **Device verdict:** **PENDING** formal matrix

---

## 12. Deep link result

| Type | Path | Status |
|------|------|--------|
| `message.received` | `/messages/{conversationId}` | **PASS** (resolver) |
| Reports | `/notifications` | **PASS** |
| Orders | `/orders/{orderNumber}` | **PASS** |
| SW `notificationclick` | `souq:push-navigate` + `openWindow` | **PASS** (code) |
| Device tap test | — | **PENDING** |

---

## 13. Screenshots / evidence

- Mohamed before/after: status bar white square → SA monogram (attached to session 2026-06-11)
- Automated: `infra/hetzner/deploy/p17-9-13-push-chain-diagnose.json` — VAPID PASS, badge asset PASS, v9 SW pending deploy

---

## 14. Rollback plan

| Layer | Action |
|-------|--------|
| **API** | `rollback-api.sh` to prior image (pre `p17-9-13`) |
| **Frontend** | Vercel instant rollback to previous deployment |
| **SW** | Users may need one refresh; old cache bucket auto-purged on activate |
| **Data** | Push subscriptions unchanged; prefs unchanged |

---

## 15. PASS / FAIL

| Criterion | Result |
|-----------|--------|
| 1–13 closure checklist (user spec) | **Not all met** |
| Automated `p17-9-13:validate` | **PASS** |
| Production chain diagnose (full) | **INCOMPLETE** (no prod creds in local env; v9 SW not deployed) |
| Device matrix | **PENDING** |

### **Verdict: P17-9-13 = OPEN / FAIL**

Close only when Mohamed completes device matrix with `verdict: P17_9_13_PUSH_VERIFY_PASS` after API + frontend deploy.

---

## Phase Continuity Lock (قفل الاستمرار المرحلي)

*Mandatory per Execution Discipline Policy (EDP). Authority: PROJECT_STATE.md as of 2026-06-11.*

### 1. Current phase

| Field | Value |
|-------|-------|
| **Open builder phase** | `P17-9-13` |
| **Status** | Open — architectural fix landed; production device verification pending |
| **Owning P-domain** | `P17` |
| **Scope in one line** | Close unified OS push on Production Android (reports + messages + permission + branding) |

### 2. Only next phase allowed to open

| Field | Value |
|-------|-------|
| **Next milestone (single)** | `P17-9-13` device verification PASS on Production Android |
| **Blocked until** | Mohamed-approved deploy + device matrix PASS |
| **Must NOT open yet** | P17-9-8, Notification Settings redesign, Privacy, Google Play, Pre-Launch |

### 3. Do not touch (protected)

- P2 auth / sessions / CSRF
- STAGING ref `qkczposlooaldmsjfmun` vs PRODUCTION `nptfxtkedqndkgmrcntn`
- Admin protected zones (P8)
- Secrets in git/docs/chat

### 4. Do not re-analyze (closed — SSOT frozen)

- P17-9-16, P17-9-17, P17-9-1…P17-9-7, P17-8, P17-7A, P9-A/B/C/D, P8-1, P15-3/4

### 5. Re-read constitution or PROJECT_STATE for next work?

| Document | Re-read? | Reason |
|----------|----------|--------|
| `PROJECT_CONSTITUTION.md` | No | Entry pointer unchanged |
| `architecture/CONSTITUTION.md` | No | No charter change |
| `PROJECT_STATE.md` | **Yes** | Before device verify close |
| Last report PCL | **Yes** | This document |

### 6. Read next (phase-scoped only)

| Purpose | Paths |
|---------|-------|
| Runbook | `docs/runbooks/P17-9-13-push-device-verification.md` |
| Deploy | `infra/hetzner/deploy/p17-9-13-prod-deploy-remote.sh` |
| Verify | `infra/hetzner/deploy/p17-9-13-push-prod-verify.mjs` |
| Owned code | `artifacts/souq/public/sw.js`, `notification-permission-prompt.tsx`, `message-notifications.ts`, `delivery-policy.ts` |

### 7. Blocked until current phase closes

| Blocked item | Why |
|--------------|-----|
| P17-9-8+ | P17-9-13 not closed |
| Notification Settings / Privacy / Google Play | User gate |

### 8. Out of scope — ignore if proposed

- FCM native migration (document as future; not this close)
- Notification settings UI redesign
- New P-numbers

**Next session entry point:** `PROJECT_STATE.md` → this PCL §6 → deploy → device matrix → PASS.
