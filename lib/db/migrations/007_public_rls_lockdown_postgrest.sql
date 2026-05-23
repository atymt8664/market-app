-- 007_public_rls_lockdown_postgrest.sql
--
-- Purpose (Souq / Express + Drizzle + pg pool):
--   Harden Supabase-hosted Postgres: enable RLS on application tables in `public`,
--   and revoke direct table/sequence privileges from `anon` and `authenticated`
--   so PostgREST / Data API cannot read or write these tables without explicit grants.
--
-- NOT executed automatically by this repo. Apply manually in Supabase SQL Editor
-- on staging first, then production after verification. Do not paste secrets into logs.
--
-- Preconditions (read before running):
--   * The API must connect with a DB role that bypasses RLS for owned tables or has
--     BYPASSRLS / superuser — Supabase pooler `postgres` normally satisfies this.
--     If DATABASE_URL uses a custom least-privilege role that is NOT the table owner,
--     enabling RLS can block the backend until you add tailored policies for that role.
--   * This file does NOT modify `auth`, `storage`, or `extensions` schemas.
--   * Storage bucket policies must be reviewed separately in the Supabase dashboard.
--
-- Rollback (emergency — run only if you confirmed the migration caused breakage):
--   * Repeat the loop below with DISABLE ROW LEVEL SECURITY instead of ENABLE, and
--     GRANT ALL ON TABLE public.<name> TO anon, authenticated; only if you truly
--     need PostgREST access again (not recommended for this app).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users',
    'user_sessions',
    'app_settings',
    'admin_activity_logs',
    'messages',
    'conversations',
    'message_hides',
    'conversation_hides',
    'reports',
    'support_tickets',
    'support_ticket_messages',
    'notifications',
    'notification_preferences',
    'ads',
    'ad_favorites',
    'ad_likes',
    'ad_views',
    'categories',
    'subcategories',
    'cities',
    'user_follows',
    'user_views'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = t
        AND table_type = 'BASE TABLE'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Sequences in `public` (serial/identity); anon/authenticated do not need sequence USAGE
-- for app tables when access is only via the backend connection role.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, c.relname AS seqname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM anon, authenticated',
      r.sch,
      r.seqname
    );
  END LOOP;
END $$;

-- New objects created by `postgres` in `public`: do not auto-grant PostgREST roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
