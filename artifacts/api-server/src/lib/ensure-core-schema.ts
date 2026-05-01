import type { Pool } from "pg";

/**
 * Idempotent DDL so production/staging DBs stay aligned with Drizzle schemas
 * under lib/db/src/schema (users, reports, user_sessions). Safe: no DROP, no DELETE.
 */
const CORE_SCHEMA_SQL = `
-- Legacy rename (older templates used "password")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users RENAME COLUMN password TO password_hash;
  END IF;
END $$;

-- users (lib/db/src/schema/users.ts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE users SET city = '' WHERE city IS NULL;
UPDATE users SET email_verified = COALESCE(email_verified, false) WHERE email_verified IS NULL;
UPDATE users SET is_banned = COALESCE(is_banned, false) WHERE is_banned IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

-- reports (lib/db/src/schema/reports.ts)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_user_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_ad_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();

UPDATE reports SET status = 'pending' WHERE status IS NULL;
UPDATE reports SET reason = '' WHERE reason IS NULL;

-- user_sessions (connect-pg-simple; matches lib/db/src/schema/user-sessions.ts)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions (expire);
`;

export async function ensureCoreSchema(pool: Pool): Promise<void> {
  await pool.query(CORE_SCHEMA_SQL);
}
