# P8 — Admin Panel

| Field | Value |
|-------|-------|
| **Code** | P8 |
| **Status** | Active (High protection) — **#2 execution priority** (admin maturity, `p8.admin.*` i18n) |
| **Protection level** | High for auth integration — coordinate with **P2**

---

## الهدف / Goal

**Internal operations**: moderation, user management, categories/cities config, support tickets, stats, billing/plans UI, activity logs, and admin 2FA settings UI.

---

## المسؤوليات / Responsibilities

- Admin REST API (`routes/admin.ts`, `support.ts`, `admin-presence.ts`)
- Admin activity logging
- Admin settings / app_settings
- All `/admin/*` frontend pages and `features/admin/`
- Admin 2FA settings UI (logic in **P2**)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `routes/admin.ts`, `support.ts`, `admin-presence.ts`, `lib/admin-*.ts`, `ensure-app-settings-table.ts`, `ensure-category-admin-columns.ts`, `ensure-city-admin-columns.ts` |
| Middleware | `middlewares/require-admin.ts` |
| Schema | `admin-activity-logs.ts`, `app-settings.ts`, admin columns on `cities`, `categories` |
| Frontend | `pages/admin*.tsx`, `features/admin/**` |
| i18n (target) | `p8.admin.*` — **required migration** (much UI still hardcoded Arabic) |

---

## ما المسموح تعديله / Allowed changes

- Admin workflows, tables, filters
- Dashboards (metrics display with **P13**)
- i18n migration to `p8.admin.*`

---

## ما الممنوع تعديله / Forbidden changes

- Core session/CSRF/TOTP implementation (**P2**) without Auth owner
- Production deploy (**P0**) without approval
- Infra/nginx (**P0**)

---

## Boundaries

- **Internal-only** routes — never exposed as public marketplace features
- Uses **P4** APIs for ad moderation actions

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P2** | Admin login, 2FA, session |
| **P7** | IP allowlist, security |
| **P4**, **P5** | Entity moderation |
| **P13** | Metrics |

---

## Owner scope

- **Primary:** **Developer C**

---

## Scalability notes

- Admin stats queries — move heavy aggregates to read replica / **P15** rollups
- Audit log growth — archival job (**P15**)

---

## Future roadmap

- **P8 i18n plan:** move all admin strings to `p8.admin.*` (en/de/ar)
- RBAC roles beyond single admin model
- Impersonation with audit (long-term)

---

## Testing requirements

- STAGING admin login + 2FA + CRUD smoke (test admin only)
- No PRODUCTION admin testing without approval
- `i18n:check` after i18n migration

---

## Security notes

- `require-admin` + IP gate + access key + TOTP
- `admin_security_revision` session invalidation
- Admin actions logged to `admin-activity-logs`

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `ADMIN_PLAN.md` (repo root) | Historical checklist — superseded by this doc |

---

## i18n namespace

**Target:** `p8.admin.*` — mandatory for new strings; replace hardcoded Arabic in admin pages incrementally.
