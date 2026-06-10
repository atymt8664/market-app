import { pool } from "@workspace/db";

const MESSAGE_REACTIONS_SQL = `
CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_user_message_unique UNIQUE (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON message_reactions (message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx ON message_reactions (user_id);
`;

export async function ensureMessageReactionsSchema(): Promise<void> {
  await pool.query(MESSAGE_REACTIONS_SQL);
}
