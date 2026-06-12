-- P6 Security: User TOTP 2FA columns (per-user, separate from admin app_settings 2FA)

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes_hash TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_revision INTEGER NOT NULL DEFAULT 0;
