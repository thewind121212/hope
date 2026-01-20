-- Migration: Create sync_settings table
-- Stores user preferences for sync mode (off, plaintext, e2e)

CREATE TABLE IF NOT EXISTS sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_mode TEXT NOT NULL DEFAULT 'off', -- 'off' | 'plaintext' | 'e2e'
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_sync_settings_user ON sync_settings(user_id);

-- Add trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_settings_updated_at ON sync_settings;
CREATE TRIGGER sync_settings_updated_at
  BEFORE UPDATE ON sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_settings_updated_at();
