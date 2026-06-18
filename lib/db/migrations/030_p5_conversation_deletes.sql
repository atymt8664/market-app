-- P5-Chat: per-user conversation delete (additive, production-safe).
-- Distinct from conversation_hides: deleted rows do not appear in inbox or hidden collection.
CREATE TABLE IF NOT EXISTS conversation_deletes (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS conversation_deletes_user_idx ON conversation_deletes (user_id);
