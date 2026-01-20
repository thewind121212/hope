-- Migration: Add support for plaintext sync mode and record types
-- This allows users to sync without E2E encryption

-- Add record_type to distinguish Bookmark/Space/PinnedView
ALTER TABLE records ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'bookmark';

-- Add plaintext data column for non-E2E sync (JSONB for efficient querying)
ALTER TABLE records ADD COLUMN IF NOT EXISTS data JSONB;

-- Add encrypted flag to know if record is E2E or plaintext
ALTER TABLE records ADD COLUMN IF NOT EXISTS encrypted BOOLEAN NOT NULL DEFAULT true;

-- Make ciphertext nullable (can be null when plaintext sync)
ALTER TABLE records ALTER COLUMN ciphertext DROP NOT NULL;

-- Make vault_id nullable (plaintext records don't need a vault)
ALTER TABLE records ALTER COLUMN vault_id DROP NOT NULL;

-- Index for faster queries by record type
CREATE INDEX IF NOT EXISTS idx_records_record_type ON records(user_id, record_type);

-- Index for encrypted status queries
CREATE INDEX IF NOT EXISTS idx_records_encrypted ON records(user_id, encrypted);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_records_user_type_updated ON records(user_id, record_type, updated_at);
