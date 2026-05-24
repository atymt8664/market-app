# P2 — Authentication & Sessions

| Field | Value |
|-------|-------|
| **Code** | P2 |
| **Status** | Active |
| **Protection level** | High — do not change without explicit approval |

---

## الهدف / Goal

Secure **identity** for users and admins: registration, login, logout, sessions (PostgreSQL store), CSRF for mutations, email verification, password reset, and admin TOTP / 2FA enrollment.

---

## المسؤوليات / Responsibilities

- User auth API (`/api/auth/*`)
- Session cookie configuration (`session-cookie.ts`, `session-secret.ts`)
- `require-auth` middleware
- User CSRF token generation and validation (`require-user-csrf.ts`)
- Email flows (Resend) for verify/reset
- Admin login + TOTP pending state (coordination with **P8** UI)
- `user_sessions` table usage

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API routes | `artifacts/api-server/src/routes/auth.ts`, `admin-2fa.ts` |
| Middleware | `middlewares/require-auth.ts`, `require-user-csrf.ts` |
| Lib | `lib/session-*.ts`, `lib/email.ts`, `lib/admin-totp.ts`, `lib/admin-backup-codes.ts`, `lib/admin-2fa-constants.ts`, `lib/admin-security-revision.ts` |
| App wiring | `artifacts/api-server/src/app.ts` (`SessionData` fields for user + admin) |
| Schema | `lib/db/src/schema/user-sessions.ts`, auth columns on `users.ts` |
| Frontend | `pages/login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`, `admin-login.tsx`, `hooks/use-auth.ts` |
| i18n (target) | `p2.auth.*` (legacy: mixed `login.*`, etc.) |

---

## ما المسموح تعديله / Allowed changes

- Bug fixes with STAGING proof and security review
- New auth methods only after architecture review
- i18n key migration under `p2.auth.*`

---

## ما الممنوع تعديله / Forbidden changes

- Drive-by changes during other P work
- Weakening CSRF, session TTL, or password policy without approval
- Sharing session secrets across environments
- Production auth experiments without approval

---

## Boundaries

- **Exports:** Authenticated `req.session` / user id to other routes
- **Does not:** Ad visibility (P4), chat delivery (P5), admin CRUD (P8)

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P1** | Env for secrets, DB URL |
| **P7** | Rate limits on auth endpoints |
| **P0** | HTTPS / cookie `Secure` flag |

| Used by | Reason |
|---------|--------|
| P4–P8 | Protected routes |

---

## Owner scope

- **Primary:** Auth squad
- **Coordination:** **P8** for admin 2FA UI; Mohamed for production-impacting changes

---

## Scalability notes

- Sessions in PostgreSQL today — at scale move session cache to **Redis (P16)**
- Admin and user CSRF tokens must remain separable

---

## Future roadmap

- Passkeys / WebAuthn
- Device session list and revoke
- `p2.auth.*` i18n namespace completion

---

## Testing requirements

- API unit tests in `artifacts/api-server` auth-related tests
- STAGING: signup → verify → login → logout → reset password
- CSRF rejection on mutation without token
- No automated tests against PRODUCTION credentials

---

## Security notes

- bcrypt password hashing
- Separate admin session fields and `adminCsrfToken`
- Admin security revision invalidates sessions on bump
- **Never log** session secrets, tokens, or passwords

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `phase6-test-forgot-password-existing.sh` | STAGING auth smoke (**P0** script, **P2** domain) |

---

## i18n namespace

**Target:** `p2.auth.*` — Arabic default, RTL via global i18n.
