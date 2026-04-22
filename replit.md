# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Souq Auth (April 2026)

- Email + bcrypt password auth, session stored in Postgres `user_sessions` (connect-pg-simple). Session cookie name `souq.sid`, configured in `artifacts/api-server/src/app.ts`. Table is created manually (`createTableIfMissing` doesn't work in esbuild bundle).
- Routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `ads` table has `user_id` FK to `users`. Routes `POST /ads`, `PATCH /ads/:id`, `DELETE /ads/:id`, `GET /ads/mine` are gated by `requireAuth` middleware; PATCH/DELETE check ownership.
- Frontend hook: `artifacts/souq/src/hooks/use-auth.ts`. Pages: `login.tsx`, `signup.tsx`, `edit-ad.tsx` (wraps `create-ad.tsx` with `editId` prop). Bottom nav "+" gates on auth → redirects to `/login?redirect=/new`.
