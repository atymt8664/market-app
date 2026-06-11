-- P17-9-2: Notification idempotency + contract columns (additive, backward compatible)
-- Spec: artifacts/api-server/src/lib/notifications/contract.ts

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedup_key TEXT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS aggregation_key TEXT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 2;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'system';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_priority_check'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_priority_check
      CHECK (priority >= 0 AND priority <= 3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_category_check'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_category_check
      CHECK (category IN (
        'messages', 'marketplace', 'orders', 'support', 'reports',
        'trust_safety', 'security', 'admin', 'system', 'social'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_domain_check'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_domain_check
      CHECK (domain IN (
        'messages', 'marketplace', 'orders', 'support', 'reports',
        'trust', 'security', 'admin', 'system', 'social', 'verification'
      ));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedup_key_unique
  ON notifications (user_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_user_category_created_idx
  ON notifications (user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_aggregation_key_idx
  ON notifications (user_id, aggregation_key)
  WHERE aggregation_key IS NOT NULL;
