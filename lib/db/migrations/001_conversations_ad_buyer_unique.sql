-- One conversation per buyer per ad (matches Drizzle uniqueIndex on conversations).
-- Safe to run on existing DBs: creates index only if missing.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_ad_id_buyer_id_unique
  ON conversations (ad_id, buyer_id);
