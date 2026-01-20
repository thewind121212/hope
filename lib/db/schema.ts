export interface Vault {
  id: string;
  user_id: string;
  wrapped_key: Buffer;
  salt: Buffer;
  kdf_params: KdfParams;
  enabled_at: Date;
  device_fingerprint: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Record {
  id: string;
  user_id: string;
  vault_id: string | null;
  record_id: string;
  record_type: 'bookmark' | 'space' | 'pinned-view';
  ciphertext: Buffer | null;
  data: unknown | null; // JSONB - Bookmark | Space | PinnedView
  encrypted: boolean;
  version: number;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SyncSettings {
  id: string;
  user_id: string;
  sync_enabled: boolean;
  sync_mode: 'off' | 'plaintext' | 'e2e';
  last_sync_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface KdfParams {
  algorithm: 'PBKDF2';
  iterations: number;
  saltLength: number;
}
