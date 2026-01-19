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
  vault_id: string;
  record_id: string;
  ciphertext: Buffer;
  version: number;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface KdfParams {
  algorithm: 'PBKDF2';
  iterations: number;
  saltLength: number;
}
