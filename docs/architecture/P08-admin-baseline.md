# P8 — Admin Baseline (code-verified inventory)

**Authority:** Single source of truth for what exists in-repo **today**. Updated by **P8-1A** (doc sync only — no application code changes).

**Related:** [P08-admin.md](./P08-admin.md) · [P08-admin-notes.md](./P08-admin-notes.md) · [P8-1A STAGING smoke](../runbooks/P8-1A-staging-admin-smoke.md)

**Verification method:** Static analysis of `artifacts/souq` + `artifacts/api-server` (2026-05-31).

---

## Frontend pages (20 + 1 redirect)

| Route | Page file | Backend wired |
|-------|-----------|---------------|
| `/admin-login` | `pages/admin-login.tsx` | ✅ Auth APIs |
| `/admin` | `pages/admin.tsx` | ✅ `/admin/dashboard` |
| `/admin/ads` | `pages/admin-ads.tsx` | ✅ |
| `/admin/reports` | `pages/admin-reports.tsx` | ✅ |
| `/admin/support` | `pages/admin-support.tsx` | ✅ |
| `/admin/users` | `pages/admin-users.tsx` | ✅ |
| `/admin/users/:id` | `pages/admin-user-details.tsx` | ✅ |
| `/admin/analytics` | `pages/admin-stats.tsx` | ✅ `/admin/analytics` |
| `/admin/stats` | Redirect → `/admin/analytics` | — |
| `/admin/operations` | `pages/admin-operations.tsx` | ✅ (Founder nav only) |
| `/admin/monitoring` | `pages/admin-monitoring.tsx` | ✅ (Founder nav only) |
| `/admin/staff` | `pages/admin-staff.tsx` | ✅ |
| `/admin/force-password-change` | `pages/admin-force-password-change.tsx` | ✅ |
| `/admin/cities` | `pages/admin-cities.tsx` | ✅ (no city DELETE API) |
| `/admin/categories` | `pages/admin-categories.tsx` | ✅ |
| `/admin/logs` | `pages/admin-logs.tsx` | ✅ |
| `/admin/billing` | `pages/admin-billing.tsx` | ⛔ UI placeholder only |
| `/admin/verification` | `pages/admin-verification.tsx` | ✅ |
| `/admin/plans` | `pages/admin-plans.tsx` | ⛔ UI placeholder only |
| `/admin/settings` | `pages/admin-settings.tsx` | ✅ GET + PATCH |

**Shell / nav:** `features/admin/components/admin-shell.tsx` — 16 nav items; `operations` + `monitoring` hidden unless Founder.

**Access guards:** `features/admin/access.ts` — `useRequireAdmin()`, `canAccessRoute()`, role-based home paths.

---

## Backend route modules (admin)

| Module | Prefix / paths |
|--------|----------------|
| `routes/auth.ts` | `/admin-login`, `/admin-login/totp`, `/admin/me`, `/admin-logout` |
| `routes/admin.ts` | Dashboard, analytics, settings, users, logs, categories, cities |
| `routes/ads.ts` | `/admin/ads/*` |
| `routes/admin-reports-workflow.ts` | `/admin/reports/*` |
| `routes/support.ts` | `/admin/support/*` |
| `routes/admin-verification-workflow.ts` | `/admin/verification/*` |
| `routes/admin-staff.ts` | `/admin/staff/*` |
| `routes/admin-operations.ts` | `/admin/operations/*` |
| `routes/admin-monitoring.ts` | `/admin/monitoring` |
| `routes/admin-presence.ts` | `/admin/active-app-users-count` |
| `routes/admin-2fa.ts` | `/admin/2fa/*` |

**Not implemented:** `/admin/billing/*`, `/admin/plans/*`, `/admin/notifications/*`.

**Legacy removed:** No `/reports/admin/*` handlers in `routes/reports.ts` (unified on `/admin/reports*`).

---

## Middleware & security stack

| Layer | Implementation |
|-------|----------------|
| IP allowlist | `middlewares/admin-ip-gate.ts` |
| Access key (login) | `X-Admin-Access-Key` when configured |
| Session + TTL | `middlewares/require-admin.ts` (default 8h) |
| CSRF | `requireAdminCsrf` on mutations |
| Security revision | Session invalidation on password/2FA change |
| RBAC | `middlewares/require-admin-permission.ts` + `lib/admin-rbac.ts` |
| Founder 2FA | TOTP + backup codes (`routes/admin-2fa.ts`) |
| Staff accounts | Email login, `mustChangePassword`, force-change page |
| Audit | `lib/admin-audit.ts` → `admin_activity_logs` |

---

## RBAC roles (implemented)

Defined in `lib/admin-rbac.ts` (backend) and `features/admin/rbac.ts` (frontend).

| Role key | Permissions (summary) |
|----------|------------------------|
| `founder` | All areas; `adminActorId: 1` on founder password login |
| `moderator` | Dashboard moderation, ads, reports, verification |
| `support` | Support tickets |
| `verification` | Verification queue |
| `analyst` | Analytics |
| `finance_manager` | Billing, plans (UI placeholders until **P10**) |
| `admin_manager` | Operations dashboard, settings, staff, cities, categories, logs, users |

**Staff storage:** `admin_staff` table (runtime DDL in `lib/admin-staff-workflow.ts` + `lib/admin-staff-management.ts`). **Not** separate `admin_roles` / `admin_permissions` tables — permissions are code-defined per role key.

**Dashboard roles panel:** `roles-permissions-foundation.tsx` is an **architecture contract** on the NOC page; live enforcement is middleware + nav guards + `/admin/staff`.

---

## Feature readiness matrix

| Area | Status | Notes |
|------|--------|-------|
| Ads moderation | ✅ Full | Status, featured, delete, claim/assign/release, SLA, reject reason in audit |
| Reports | ✅ Full | Status, ad-action, claim/assign/release, SLA |
| Support | ✅ Full | Tickets, messages, reply, claim/assign/release; `adminId` = `getAdminActorId` |
| Users | ⚠️ Partial | Ban/unban, avatar review; `last_seen_at` in detail only, not list |
| Verification | ✅ Full | Queue, documents, claim/assign/release/escalate, status workflow |
| Categories | ✅ Full | CRUD tree |
| Cities | ⚠️ Partial | Create, update, hide/show — no DELETE endpoint |
| Analytics | ✅ Full | Period metrics, charts |
| Logs | ⚠️ Partial | Pagination + filters; actor = `Founder` or `admin#<id>` |
| Staff | ✅ Full | CRUD, revoke sessions, activity, initial password change |
| Operations | ✅ Full | Queue summary, staff load (Founder / admin_manager) |
| Monitoring | ✅ Full | Founder-only snapshot |
| Settings | ✅ Full | GET + PATCH UI; founder password change + 2FA |
| Billing / Plans | ⛔ Placeholder | Explicit disconnected UI — **P10** |
| Notification center (NOC) | ⛔ Contract UI | No admin feed — **P11 / P15** |
| NOC CPU row | ⏳ Placeholder | `p8.admin.noc.cpu.waiting_host_metrics` — **P13** |
| i18n | ⚠️ Partial | Most pages use `p8.admin.*`; `de` fragment has placeholders; billing/plans use `admin_billing.*` / `admin_plans.*` |

---

## Explicit deferrals (not P8 blockers for core ops)

| Item | Owner phase | Reason |
|------|-------------|--------|
| Revenue / billing APIs | **P10** | No payment integration |
| Admin notification feed | **P11 / P15** | User notifications exist; staff inbox separate |
| Host CPU in NOC | **P13** | VPS host metrics |
| Multi-replica presence count | **P16** | `active-app-users-count` uses in-memory WebSocket map |
| `admin_activity_logs` formal migration | **P1 / P8** | Runtime `ensureAdminLogsReady` today |

---

## P8-1 sub-milestone map

| ID | Scope | Status |
|----|-------|--------|
| **P8-1A** | Baseline & doc sync (this file + notes + smoke runbook) | ✅ Closed |
| **P8-1B** | Settings PATCH UI on `/admin/settings` | ✅ Closed |
| P8-1C | User center polish (`last_seen` list, deep links) | ✅ Closed |
| P8-1D | Audit & logs maturity | ✅ Closed |
| P8-1E | i18n closure (P8G) | ✅ Closed |
| P8-1F | Dashboard contracts (notification / roles UX) | ⏳ Open |
| P8-1G | Billing/plans boundary doc (**P10**) | ⏳ Open |
| P8-1H | P13 CPU hook | ⏳ Open |
| P8-1I | STAGING verification & P8-1 close | ⏳ Open |

---

*P8-1A — baseline inventory. Re-verify after any admin route or page change.*
