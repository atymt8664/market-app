-- Phase 8: WhatsApp-style delete-for-everyone (soft delete, tombstone in thread).
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone_at TIMESTAMPTZ NULL;
