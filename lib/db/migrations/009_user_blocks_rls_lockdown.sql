-- 009_user_blocks_rls_lockdown.sql
-- Extends 007 for user_blocks (added in 008). Apply on STAGING first, then Production after approval.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_blocks'
      AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.user_blocks FROM anon, authenticated';
  END IF;
END $$;
