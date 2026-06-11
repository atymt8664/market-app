# P17-9-13 — Push Device Verification Runbook

**Environment:** PRODUCTION (`nptfxtkedqndkgmrcntn`) — device tests only after deploy + automated gate PASS.

**Goal:** Prove OS push outside the app (background · killed · lock screen) on a real Android device.

## Root cause (2026-06-11 fix)

1. **Server WS skip** — fixed in `delivery-policy.ts` (server always sends webpush).
2. **Missing Web Push subscription** — auto-sync in `push-notifications-registrar.tsx` when OS permission granted.
3. **White status-bar icon** — `badge` used full-color `pwa-icon-192.png`; Android requires monochrome `notification-badge-96.png`.
4. **Diagnose:** `node infra/hetzner/deploy/p17-9-13-push-chain-diagnose.mjs`

**Deploy required:** API + Frontend (`sw.js` v7 branding, notification icons, registrar).

## Android Notification Channel (Web Push)

Chrome/TWA maps site notifications to the **default site channel**. Native `NotificationChannel` IDs are not settable from Web Push alone. For heads-up on lock screen:

- Use monochrome `badge` + `vibrate` in `sw.js` (done).
- User: Android Settings → Apps → Souq Arab EU → Notifications → ensure **High** importance / lock screen visible.
- Future TWA APK: set `default_notification_icon` in Bubblewrap manifest (P11).

---

## Prerequisites

1. Android phone with Chrome (or installed TWA when available).
2. Test account: `PROD_VERIFY_EMAIL` (same as prod smoke).
3. On phone: login → `/account/notifications` → enable **Turn on notifications** → grant permission.
4. Local `.env.local` has `PROD_VERIFY_PASSWORD`, `P17_9_7_ADMIN_PASSWORD`, `ADMIN_ACCESS_KEY`.

---

## Step 1 — Static gate

```bash
pnpm --filter @workspace/api-server run p17-9-13:validate
pnpm --filter @workspace/api-server run p17-9-4:validate
```

---

## Step 2 — Automated API gate

```bash
node infra/hetzner/deploy/p17-9-13-push-prod-verify.mjs
```

Expected first run: **FAIL** with `deviceMatrix PENDING` until Step 4 completes.

Automated layer verifies: VAPID · SW · push subscription · prefs gate · realtime · counters · in-app dedup.

---

## Step 3 — Trigger push on device

While phone is in the target state, run from laptop (triggers admin test broadcast):

```bash
node infra/hetzner/deploy/p17-9-13-push-prod-verify.mjs
```

Or use Admin → Broadcasts → test audience (same as P17-9-17).

**Trigger order for device matrix:**

| # | Phone state | Expect OS notification? |
|---|-------------|-------------------------|
| 1 | App open (foreground) | **No** (WS skip — in-app only) |
| 2 | App background | **Yes** |
| 3 | App killed (swipe from recents) | **Yes** |
| 4 | Chrome tab foreground | **No** (WS if logged in same session) |
| 5 | Chrome tab background | **Yes** |
| 6 | Chrome closed | **Yes** (if SW registered) |
| 7 | TWA foreground | **No** |
| 8 | TWA background | **Yes** |
| 9 | TWA killed | **Yes** |
| 10 | Lock screen (locked when arrives) | **Yes** on lock screen |

For each OS notification: tap → verify correct page opens · no duplicate banners for same event.

---

## Step 4 — Quiet hours (device)

1. On phone: `/account/notifications/quiet-hours` → enable window covering **now**.
2. Kill app / lock screen.
3. Trigger broadcast from admin.
4. **Expect:** no OS push · in-app notification still appears when app opened.

---

## Step 5 — Preferences (device)

1. Disable **Announcements** toggle.
2. Trigger broadcast → **no** new notification.
3. Re-enable → trigger → notification arrives.

---

## Step 6 — Submit device matrix

```bash
cp infra/hetzner/deploy/p17-9-13-device-matrix.template.json infra/hetzner/deploy/p17-9-13-device-matrix.json
# Edit PASS/FAIL per scenario
P17_9_13_DEVICE_MATRIX=infra/hetzner/deploy/p17-9-13-device-matrix.json node infra/hetzner/deploy/p17-9-13-push-prod-verify.mjs
```

**PASS criteria:** `verdict: P17_9_13_PUSH_VERIFY_PASS` in `p17-9-13-push-prod-verify.json`.

---

## Rollback

No production deploy in this phase. Test broadcasts are harmless. Restore prefs:

- `notifyAnnouncements: true`
- `quietHoursEnabled: false`

---

## Out of scope

- FCM / new push features
- Notification settings redesign (next roadmap step)
- Privacy minimum (after P17-9-13 close)
