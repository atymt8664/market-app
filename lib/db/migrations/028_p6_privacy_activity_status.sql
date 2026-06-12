-- P6-PRIVACY-3: Activity status & last-seen visibility (per-user privacy controls)

ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_activity_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_last_seen_visible BOOLEAN NOT NULL DEFAULT true;
