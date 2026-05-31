# P8 — Admin Panel

| Field | Value |
|-------|-------|
| **Code** | P8 |
| **Status** | Active — **P8-1 open** (P8-1A ✅ · P8-1B ✅ closed) |
| **Protection level** | High for auth integration — coordinate with **P2** |
| **Baseline (code-verified)** | [P08-admin-baseline.md](./P08-admin-baseline.md) |
| **Ops notes & deferrals** | [P08-admin-notes.md](./P08-admin-notes.md) |
| **STAGING smoke** | [P8-1A staging admin smoke](../runbooks/P8-1A-staging-admin-smoke.md) |

---

## الهدف / Goal

**Internal operations**: moderation, user management, categories/cities config, support tickets, verification queue, stats, staff/RBAC, activity logs, and admin 2FA settings UI. Billing/plans pages exist as **explicit placeholders** until **P10**.

---

## المسؤوليات / Responsibilities

- Admin REST APIs (see baseline for full module list)
- Admin activity logging (`admin_activity_logs`)
- Admin settings / `app_settings` (founder password hash, 2FA flags)
- All `/admin/*` frontend pages and `features/admin/`
- Admin 2FA settings UI (crypto/session in **P2** coordination)
- Staff accounts and RBAC (`admin_staff`, role permissions in code)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API routes | `routes/admin.ts`, `routes/admin-*.ts`, `routes/ads.ts` (admin handlers), `routes/support.ts` (admin handlers), `routes/auth.ts` (admin login/me/logout) |
| Middleware | `middlewares/require-admin.ts`, `require-admin-permission.ts`, `admin-ip-gate.ts`, `require-admin-founder.ts` |
| Lib | `lib/admin-*.ts`, `ensure-app-settings-table.ts`, `ensure-category-admin-columns.ts`, `ensure-city-admin-columns.ts` |
| Schema | `admin-activity-logs`, `app-settings`, `admin_staff` (runtime ensure), admin columns on `cities`, `categories`, verification tables (runtime ensure) |
| Frontend | `pages/admin*.tsx`, `features/admin/**` |
| i18n | `p8.admin.*` in `p8m3-admin-{ar,en,de}.fragment.json` — migration **in progress** (**P8-1E**) |

---

## Frontend routes (summary)

20 pages + `/admin/stats` → `/admin/analytics`. Full table: [P08-admin-baseline.md](./P08-admin-baseline.md).

---

## ما المسموح تعديله / Allowed changes

- Admin workflows, tables, filters
- Dashboards (metrics display with **P13**)
- i18n migration to `p8.admin.*`
- P8-1 sub-milestones in order (see P08-admin-notes)

---

## ما الممنوع تعديله / Forbidden changes

- Core session/CSRF/TOTP implementation (**P2**) without Auth owner
- Production deploy (**P0**) without approval from Mohamed
- Infra/nginx (**P0**)
- Mixing STAGING / PRODUCTION Supabase refs

---

## Boundaries

- **Internal-only** routes — never exposed as public marketplace features
- Ad moderation handlers live on admin sections of **P4** `ads.ts` routes
- **P10** owns billing/plans revenue APIs; P8 owns placeholder UI until then

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P2** | Admin login, 2FA, session |
| **P7** | IP allowlist, security |
| **P4**, **P5** | Entity moderation, messaging context |
| **P13** | Host metrics, observability panels |
| **P10** | Billing/plans backend (deferred) |
| **P11 / P15** | Admin notification feed (deferred) |
| **P16** | Scaled presence aggregate |

---

## Owner scope

- **Primary:** **Developer C**

---

## Scalability notes

- Admin stats queries — move heavy aggregates to read replica / **P15** rollups
- Audit log growth — archival job (**P15**)
- `active-app-users-count` — in-memory WebSocket today (**P16**)

---

## P8-1 roadmap (current wave)

| Step | ID | Focus |
|------|-----|-------|
| ✅ | P8-1A | Baseline & doc sync |
| ✅ | P8-1B | Settings PATCH UI |
| ✅ | P8-1C | User center polish |
| ⏳ | P8-1D | Logs & audit UX |
| ⏳ | P8-1E | i18n closure |
| ⏳ | P8-1F | Dashboard contracts |
| ⏳ | P8-1G | Billing/plans boundary doc |
| ⏳ | P8-1H | P13 CPU hook |
| ⏳ | P8-1I | STAGING smoke + P8-1 close |

Long-term: impersonation with audit (not scheduled).

---

## Testing requirements

- STAGING admin smoke: [P8-1A runbook](../runbooks/P8-1A-staging-admin-smoke.md)
- No PRODUCTION admin testing without approval
- `i18n:check` after i18n changes (**P8-1E**)

---

## Security notes

- `require-admin` + IP gate + access key + TOTP (founder)
- Staff email/password accounts with forced rotation
- `admin_security_revision` session invalidation
- RBAC per route; CSRF on mutations
- Admin actions logged to `admin_activity_logs` via `writeAdminAudit` / `logAdminActivity`

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `ADMIN_PLAN.md` (repo root) | **Superseded** — historical stub only |

---

## i18n namespace

**Target:** `p8.admin.*` — mandatory for new strings. Billing/plans still use legacy `admin_billing.*` / `admin_plans.*` until **P8-1E**.
