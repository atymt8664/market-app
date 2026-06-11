-- P17-9-17 — Platform Broadcasts (admin → all users fan-out audit)

CREATE TABLE IF NOT EXISTS platform_broadcasts (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'all_users',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_admin_actor_id INTEGER NOT NULL,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_cursor_user_id INTEGER,
  send_idempotency_key TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_broadcasts_category_check CHECK (
    category IN (
      'platform_update',
      'new_feature',
      'scheduled_maintenance',
      'security_alert',
      'official_announcement'
    )
  ),
  CONSTRAINT platform_broadcasts_status_check CHECK (
    status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT platform_broadcasts_audience_check CHECK (
    audience IN ('all_users', 'test_audience')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_broadcasts_send_idempotency_unique
  ON platform_broadcasts (send_idempotency_key);

CREATE INDEX IF NOT EXISTS platform_broadcasts_status_created_idx
  ON platform_broadcasts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_broadcasts_created_by_idx
  ON platform_broadcasts (created_by_admin_actor_id, created_at DESC);
