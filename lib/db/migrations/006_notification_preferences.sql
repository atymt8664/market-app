-- In-app notification channel preferences (optional row per user; defaults = all true).
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_messages BOOLEAN NOT NULL DEFAULT true,
  notify_ad_moderation BOOLEAN NOT NULL DEFAULT true,
  notify_support BOOLEAN NOT NULL DEFAULT true,
  notify_reports BOOLEAN NOT NULL DEFAULT true,
  notify_announcements BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
