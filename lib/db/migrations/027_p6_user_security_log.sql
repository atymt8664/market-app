-- P6 Security: User security event log (login, 2FA, session/device changes)

CREATE TABLE IF NOT EXISTS user_security_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_security_events_user_created_idx
  ON user_security_events (user_id, created_at DESC);
