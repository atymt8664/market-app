# P6 — Profile & Settings

| Field | Value |
|-------|-------|
| **Code** | P6 |
| **Status** | Active |

---

## الهدف / Goal

**User identity surface**: public profile, account settings, follow/block UI (display), profile stats, account deletion, and notification preference screens.

---

## المسؤوليات / Responsibilities

- Users API (profile, follow, presence batch, profile views)
- Account API (notification preferences, deletion)
- Account deletion workflow (`account-deletion.ts`)
- Settings and account subpages
- Notifications list UI (with **P5** for creation path)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `routes/users.ts`, `routes/account.ts`, `routes/notifications.ts` (shared read UI) |
| Lib | `lib/account-deletion.ts`, `lib/notification-preference-gate.ts`, `lib/user-blocks.ts` (read UI side) |
| Schema | `users.ts`, `notification-preferences.ts`, `notifications.ts` |
| Pages | `profile.tsx`, `user-profile.tsx`, `settings.tsx`, `account-*.tsx`, `delete-account.tsx`, `notifications.tsx` |
| Components | `profile-*`, `settings-shell.tsx`, `account-header.tsx`, `notification-bell.tsx` |
| i18n (target) | `p6.profile.*`, `p6.settings.*` (legacy: `profile.*`, `account_*`) |

---

## ما المسموح تعديله / Allowed changes

- Profile fields and settings UX
- Notification preference keys (coordinate **P5** producers)
- GDPR-style export (future)

---

## ما الممنوع تعديله / Forbidden changes

- Admin user management (**P8**)
- Auth credentials (**P2**)
- Block enforcement logic core (**P7**)

---

## Boundaries

- User manages **own** account; moderation is **P8**

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P2** | Session |
| **P5** | Block effect on chat |
| **P7** | Blocks/reports |
| **P15** | Async account deletion jobs (future) |

---

## Owner scope

- **Primary:** Profile squad

---

## Scalability notes

- Profile view counters — watch DB write rate; aggregate via **P15** later
- Large follower lists — pagination required

---

## Future roadmap

- Data export package
- Fix remaining hardcoded strings (e.g. `user-profile.tsx`)
- `p6.*` i18n namespaces

---

## Testing requirements

- STAGING: update profile, notification prefs, delete account flow (test user)
- `i18n:check`

---

## Security notes

- Account deletion irreversible — confirm UX
- Profile visibility rules per product policy

---

## Related legacy phase paths

None dedicated.

---

## i18n namespace

**Target:** `p6.profile.*`, `p6.settings.*`
