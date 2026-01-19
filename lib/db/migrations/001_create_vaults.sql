-- Vaults table: Stores encrypted key envelopes for each user
CREATE TABLE IF NOT EXISTS vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  wrapped_key BYTEA NOT NULL,
  salt BYTEA NOT NULL,
  kdf_params JSONB NOT NULL,
  enabled_at TIMESTAMP DEFAULT NOW(),
  device_fingerprint TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id);
