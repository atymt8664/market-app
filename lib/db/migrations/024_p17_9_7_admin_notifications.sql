-- P17-9-7 — Admin Notification Center (staff-only, separate from user notifications)

CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 2,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id INTEGER,
  metadata JSONB,
  dedup_key TEXT NOT NULL,
  deep_link_path TEXT NOT NULL DEFAULT '/admin',
  required_permission TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_notifications_priority_check CHECK (priority >= 0 AND priority <= 3),
  CONSTRAINT admin_notifications_category_check CHECK (
    category IN ('moderation', 'reports', 'support', 'verification', 'operations', 'security', 'system')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_notifications_dedup_key_unique
  ON admin_notifications (dedup_key);

CREATE INDEX IF NOT EXISTS admin_notifications_category_created_idx
  ON admin_notifications (category, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_notifications_priority_created_idx
  ON admin_notifications (priority, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_notification_reads (
  notification_id INTEGER NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
  admin_actor_id INTEGER NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, admin_actor_id)
);

CREATE INDEX IF NOT EXISTS admin_notification_reads_actor_idx
  ON admin_notification_reads (admin_actor_id, read_at DESC);
