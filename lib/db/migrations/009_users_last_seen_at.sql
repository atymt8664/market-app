-- Optional presence: updated when user's last WebSocket disconnects (see api-server realtime).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NULL;
