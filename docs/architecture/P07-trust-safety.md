# P7 — Trust & Safety

| Field | Value |
|-------|-------|
| **Code** | P7 |
| **Status** | Active |

---

## الهدف / Goal

Platform **safety**: user reports, blocks, RLS policies, abuse resistance, security headers, CORS, admin IP allowlists, and edge rate limiting (with **P0**).

---

## المسؤوليات / Responsibilities

- Reports API (`POST /reports`, admin report handling coordination)
- User blocks enforcement (`user-blocks.ts`)
- Security headers middleware
- CORS allowlist
- Admin IP gate middleware
- RLS migration scripts and verification SQL
- Nginx/fail2ban hardening scripts (operational, under `infra/`)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `routes/reports.ts`, `lib/user-blocks.ts`, `security-headers.ts`, `cors-allowlist.ts`, `admin-ip-allowlist.ts`, `middlewares/admin-ip-gate.ts` |
| Schema | `reports.ts`, `user-blocks.ts`, migration `009_user_blocks_rls_lockdown.sql` |
| Infra | `infra/hetzner/phase3-hardening/` |
| Scripts | `scripts/verify-supabase-security-readiness.sql` |
| Frontend | `pages/seller-trust.tsx`, report dialogs in ad/profile pages |
| i18n (target) | `p7.trust.*` |

---

## ما المسموح تعديله / Allowed changes

- Report reasons and enforcement
- RLS policies (STAGING first)
- Rate limit tuning (with **P0**)

---

## ما الممنوع تعديله / Forbidden changes

- Admin dashboard layout (**P8**) except report display
- Weakening auth (**P2**) to “reduce friction”

---

## Boundaries

- **Enforces** rules; **P8** operates moderation UI

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | Nginx limits, fail2ban |
| **P1** | STAGING RLS verify |

| Used by | Reason |
|---------|--------|
| P2, P4, P5, P8 | Blocks, reports |

---

## Owner scope

- **Primary:** Security / Trust lead
- **Reviews:** All RLS migrations

---

## Scalability notes

- Automated moderation queue → **P15**
- Trust signals for ranking → **P14**

---

## Future roadmap

- ML toxicity (optional **P12**)
- EU illegal content reporting workflow

---

## Testing requirements

- STAGING: `verify-supabase-security-readiness.sql` — zero policy violations
- `staging-phase1-supabase-verify.mjs`
- Block/report flows manual on STAGING

---

## Security notes

- RLS enabled on all app tables in STAGING/PROD
- Storage bucket policies: service_role write per product policy
- Never disable CSRF to fix report UX

---

## Related legacy phase paths

| Legacy | Role |
|--------|------|
| `phase3-hardening/` | fail2ban, nginx limits, sysctl |
| `phase1-stabilization/` | RLS audit checklist |

---

## i18n namespace

**Target:** `p7.trust.*`
