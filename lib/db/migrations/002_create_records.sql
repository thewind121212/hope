-- Records table: Stores encrypted bookmark data with version tracking
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  ciphertext BYTEA NOT NULL,
  version INTEGER DEFAULT 1,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_vault_id ON records(vault_id);
CREATE INDEX IF NOT EXISTS idx_records_record_id ON records(record_id);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON records(updated_at);
