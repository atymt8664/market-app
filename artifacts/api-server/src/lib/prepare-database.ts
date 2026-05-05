import { pool } from "@workspace/db";
import { logger } from "./logger";
import { ensureCoreSchema } from "./ensure-core-schema";

const POST_CORE_SCHEMA_SQL = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
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
    `;

/**
 * Run idempotent DDL before accepting traffic so auth and other routes never
 * hit a half-migrated schema (fixes cold-start races on Railway).
 */
export async function prepareDatabase(): Promise<void> {
  await ensureCoreSchema(pool);
  await pool.query(POST_CORE_SCHEMA_SQL);
  logger.info("Database schema ready");
}
