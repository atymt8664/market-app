-- P7-Chat: multi-ad references per buyer/seller conversation (additive, production-safe).
CREATE TABLE IF NOT EXISTS conversation_ad_references (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  ad_id integer NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_ad_references_conv_ad_unique UNIQUE (conversation_id, ad_id)
);

CREATE INDEX IF NOT EXISTS conversation_ad_references_conversation_id_idx
  ON conversation_ad_references (conversation_id);

-- Backfill primary ad from existing conversations.
INSERT INTO conversation_ad_references (conversation_id, ad_id, created_at)
SELECT c.id, c.ad_id, c.created_at
FROM conversations c
ON CONFLICT (conversation_id, ad_id) DO NOTHING;
