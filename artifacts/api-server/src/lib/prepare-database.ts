import { pool } from "@workspace/db";
import { logger } from "./logger";
import { ensureCoreSchema } from "./ensure-core-schema";
import { ensureAppSettingsTable } from "./ensure-app-settings-table";
import { ensureStaffManagementSchema } from "./admin-staff-management";
import { ensureVerificationSchema } from "./admin-verification-workflow";
import { ensureOpsQueueSchema } from "./admin-operations-queue";
import { ensureMessageReactionsSchema } from "./ensure-message-reactions-schema";

const POST_CORE_SCHEMA_SQL = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_approved_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_pending_review BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'general',
      subject TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal',
      related_ad_id INTEGER NULL REFERENCES ads(id) ON DELETE SET NULL,
      related_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ NULL
    );
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS related_ad_id INTEGER NULL REFERENCES ads(id) ON DELETE SET NULL;
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS related_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;
    UPDATE support_tickets SET category = 'general' WHERE category IS NULL OR btrim(category) = '';
    UPDATE support_tickets SET subject = 'بدون عنوان' WHERE subject IS NULL OR btrim(subject) = '';
    UPDATE support_tickets SET message = 'بدون رسالة' WHERE message IS NULL OR btrim(message) = '';
    ALTER TABLE support_tickets ALTER COLUMN category SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN subject SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN message SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN status SET NOT NULL;
    ALTER TABLE support_tickets ALTER COLUMN priority SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_tickets_status_check'
      ) THEN
        ALTER TABLE support_tickets
          ADD CONSTRAINT support_tickets_status_check
          CHECK (status IN ('open', 'pending', 'resolved', 'closed'));
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'support_tickets_priority_check'
      ) THEN
        ALTER TABLE support_tickets
          ADD CONSTRAINT support_tickets_priority_check
          CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);

    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      admin_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON support_ticket_messages(ticket_id);

    WITH dedup AS (
      SELECT id
      FROM (
        SELECT
          id,
          row_number() OVER (
            PARTITION BY ad_id, buyer_id
            ORDER BY last_message_at DESC NULLS LAST, id DESC
          ) AS rn
        FROM conversations
      ) ranked
      WHERE rn > 1
    )
    DELETE FROM conversations c
    USING dedup
    WHERE c.id = dedup.id;

    CREATE UNIQUE INDEX IF NOT EXISTS conversations_ad_id_buyer_id_unique
      ON conversations(ad_id, buyer_id);

    ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

    ALTER TABLE reports ADD COLUMN IF NOT EXISTS related_conversation_id INTEGER NULL
      REFERENCES conversations(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS message_hides (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, message_id)
    );
    CREATE INDEX IF NOT EXISTS message_hides_user_idx ON message_hides(user_id);

    CREATE TABLE IF NOT EXISTS conversation_hides (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, conversation_id)
    );
    CREATE INDEX IF NOT EXISTS conversation_hides_user_idx ON conversation_hides(user_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      entity_type TEXT NULL,
      entity_id INTEGER NULL,
      metadata JSONB NULL,
      read_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id) WHERE read_at IS NULL;

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      notify_messages BOOLEAN NOT NULL DEFAULT true,
      notify_ad_moderation BOOLEAN NOT NULL DEFAULT true,
      notify_support BOOLEAN NOT NULL DEFAULT true,
      notify_reports BOOLEAN NOT NULL DEFAULT true,
      notify_announcements BOOLEAN NOT NULL DEFAULT true,
      notify_favorites BOOLEAN NOT NULL DEFAULT true,
      push_enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS notify_favorites BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NOT NULL DEFAULT '22:00';
    ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NOT NULL DEFAULT '08:00';
    ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT NOT NULL DEFAULT 'Europe/Berlin';

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revoked_at TIMESTAMPTZ NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_unique ON push_subscriptions (endpoint);
    CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id) WHERE revoked_at IS NULL;

    CREATE TABLE IF NOT EXISTS admin_staff (
      id SERIAL PRIMARY KEY,
      admin_actor_id INTEGER NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role_key TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    INSERT INTO admin_staff (admin_actor_id, display_name, role_key)
    VALUES (1, 'Mohamed', 'founder')
    ON CONFLICT (admin_actor_id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          role_key = EXCLUDED.role_key,
          is_active = true;

    ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER NULL;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER NULL;
    CREATE INDEX IF NOT EXISTS reports_assigned_staff_idx ON reports (assigned_staff_id);

    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER NULL;
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;
    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER NULL;
    CREATE INDEX IF NOT EXISTS support_tickets_assigned_staff_idx ON support_tickets (assigned_staff_id);

    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NULL;
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL;
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS department_key TEXT NOT NULL DEFAULT 'administration';
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS login_email TEXT NULL;
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL;
    ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS created_by_admin_actor_id INT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_login_email_unique_idx
      ON admin_staff (lower(login_email))
      WHERE login_email IS NOT NULL;
    `;

/**
 * Run idempotent DDL before accepting traffic so auth and other routes never
 * hit a half-migrated schema (fixes cold-start races on Railway).
 */
export async function prepareDatabase(): Promise<void> {
  await ensureCoreSchema(pool);
  await ensureAppSettingsTable();
  await pool.query(POST_CORE_SCHEMA_SQL);
  await ensureStaffManagementSchema();
  await ensureVerificationSchema();
  await ensureOpsQueueSchema();
  await ensureMessageReactionsSchema();
  logger.info("Database schema ready");
}
