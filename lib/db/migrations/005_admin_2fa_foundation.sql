-- Admin TOTP 2FA foundation (columns only). Idempotent; safe to re-run.
-- Applied automatically via ensure-app-settings-table + prepare-database on API boot.

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_2fa_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_2fa_secret TEXT NULL;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_2fa_enabled_at TIMESTAMPTZ NULL;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_backup_codes_hash TEXT NULL;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_security_revision INTEGER NOT NULL DEFAULT 0;
