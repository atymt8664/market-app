# P8-1A — STAGING Admin Smoke Checklist

**Purpose:** Repeatable verification before each P8 sub-milestone merge and before P8-1 close.

**Environment:** 🟡 **STAGING only** (`qkczposlooaldmsjfmun`). **Never** run destructive admin CRUD against 🔴 PRODUCTION without explicit approval from Mohamed.

**Prerequisites:**

- STAGING frontend URL (Vercel preview or staging host)
- STAGING API reachable (VPS or staging API host)
- Test founder credentials + optional test staff accounts (stored in team vault — **not** in git)
- `ADMIN_ACCESS_KEY` configured for STAGING if enabled
- Browser with cookies; RTL locale optional

**Reference inventory:** [P08-admin-baseline.md](../architecture/P08-admin-baseline.md)

---

## 1. Auth & session

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1.1 | Open `/admin-login` | Page loads, `#0A0A0A` background | ☐ |
| 1.2 | Login founder (password) | Redirect to `/admin` or 2FA step | ☐ |
| 1.3 | Complete 2FA if enabled | Session established, nav visible | ☐ |
| 1.4 | `GET /api/admin/me` (via app) | `isAdmin: true`, `permissions`, `csrfToken` | ☐ |
| 1.5 | Logout | Session cleared; `/admin` redirects to login | ☐ |
| 1.6 | Staff login (email + temp password) | Redirect to `/admin/force-password-change` if required | ☐ |
| 1.7 | Staff password change | Access to role `homePath` | ☐ |

---

## 2. Role matrix (minimum)

Run with **one account per role** if available on STAGING.

| Role | Home path | Must access | Must deny (403 or redirect) |
|------|-----------|-------------|----------------------------|
| Founder | `/admin` | All nav items including operations, monitoring, staff | — |
| Moderator | `/admin` | ads, reports, verification | `/admin/staff`, `/admin/settings` |
| Support | `/admin/support` | support only | `/admin/ads` |
| Verification | `/admin/verification` | verification only | `/admin/billing` |
| Analyst | `/admin/analytics` | analytics only | `/admin/ads` |
| Admin manager | `/admin/staff` | staff, users, logs, cities, categories | `/admin/monitoring` |

| # | Step | Expected | Pass |
|---|------|----------|------|
| 2.1 | Each role: open allowed route | 200, data loads | ☐ |
| 2.2 | Each role: open denied route | Redirect to `homePath` or 403 API | ☐ |

---

## 3. Core CRUD smoke (Founder or role with permission)

| # | Area | Action | Expected | Pass |
|---|------|--------|----------|------|
| 3.1 | Dashboard | Load NOC | Real counts (not hardcoded); badges match nav | ☐ |
| 3.2 | Ads | List + filter pending | Pagination works | ☐ |
| 3.3 | Ads | Approve or reject one test ad | Status updates; audit log entry | ☐ |
| 3.4 | Reports | List open | SLA badges render | ☐ |
| 3.5 | Support | Open ticket + admin reply | Message saved; `adminId` set | ☐ |
| 3.6 | Users | Search + open detail | Ban toggle disabled for founder account | ☐ |
| 3.7 | Verification | List requests | Stats endpoint returns counts | ☐ |
| 3.8 | Categories | Toggle hide on test category | Public taxonomy cache invalidated | ☐ |
| 3.9 | Cities | Hide/show test city | Status persists | ☐ |
| 3.10 | Logs | Open `/admin/logs` | Recent actions from 3.3–3.9 visible | ☐ |
| 3.11 | Analytics | Change period | Charts refresh | ☐ |
| 3.12 | Staff | List staff (Founder) | Meta departments load | ☐ |
| 3.13 | Settings | View settings | Read-only cards; 2FA section loads | ☐ |

---

## 4. Placeholder pages (expect disconnected state)

| # | Route | Expected | Pass |
|---|-------|----------|------|
| 4.1 | `/admin/billing` | Amber “disconnected” banner; no API errors | ☐ |
| 4.2 | `/admin/plans` | Static plans; “no payment” alert | ☐ |
| 4.3 | Dashboard notification block | “Contract / pending backend” copy; no fake counts | ☐ |

---

## 5. Security spot checks

| # | Check | Expected | Pass |
|---|-------|----------|------|
| 5.1 | Mutation without CSRF header | 403 `ADMIN_CSRF_INVALID` | ☐ |
| 5.2 | `/api/admin/dashboard` without session | 401 | ☐ |
| 5.3 | Wrong IP (if allowlist enabled on STAGING) | 403 on admin routes | ☐ |

---

## Sign-off

| Field | Value |
|-------|-------|
| Date | |
| Tester | |
| STAGING frontend URL | |
| STAGING API base | |
| Overall | PASS / FAIL |
| Notes | |

**P8-1A deliverable:** This checklist exists and is referenced from baseline docs. Full execution is required again at **P8-1I** before closing P8-1.
