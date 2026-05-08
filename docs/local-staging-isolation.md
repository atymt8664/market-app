# Local/Staging Isolation Runbook

This runbook keeps production untouched while enabling safe local testing.

## 1) Create a separate Supabase staging project (manual)

Suggested name:
- `souq-arab-eu-staging`

Create in Supabase:
- New project (separate from production project)
- New database credentials
- Storage bucket: `uploads-staging` (public/private to match app needs)

Collect staging-only values:
- `DATABASE_URL` (staging Postgres URL)
- `SUPABASE_URL` (staging project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (staging)
- Frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (staging)

Do not copy production users/data.

## 2) Configure local env files (manual)

Copy examples and fill staging values:
- `artifacts/api-server/.env.local.example` -> `artifacts/api-server/.env.local`
- `artifacts/souq/.env.local.example` -> `artifacts/souq/.env.local`

Required safety fields in `artifacts/api-server/.env.local`:
- `ALLOW_REMOTE_DB_IN_DEV=1` (only when intentionally using staging DB)
- `PRODUCTION_DB_HOST_PATTERNS=<prod-db-host markers>`
- `PRODUCTION_SUPABASE_HOST_PATTERNS=<prod-supabase markers>`

The API startup guard blocks local runtime if values look production-like.

## 3) Apply schema to staging only

From repo root:

```bash
MIGRATION_TARGET=staging ALLOW_STAGING_MIGRATION=1 pnpm db:push:staging:safe
```

This command refuses to run unless:
- `MIGRATION_TARGET=staging`
- `ALLOW_STAGING_MIGRATION=1`
- `DATABASE_URL` is present
- host does not match production-like blocked patterns (if configured)

## 4) Seed policy (manual/scripted later)

Allowed seed data:
- categories test data
- admin test account
- test cities/settings

Not allowed:
- real production users
- real production ads
- any data export/import from production users table

## 5) Validation checklist

- API health:
  - `http://127.0.0.1:3001/api/healthz` -> 200
- Proxy health:
  - `http://127.0.0.1:5173/api/healthz` -> 200
- Auth flows on staging only:
  - signup / verify / login / logout
  - forgot-password / reset-password
  - 2FA/admin tests
- Upload test file appears in `uploads-staging` only

## 6) Production safety rules

Never change during local isolation work:
- Railway production envs
- Vercel production envs
- production `DATABASE_URL`
- production Supabase keys/buckets

No deploy, no commit of secrets.
