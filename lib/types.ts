export const BOOKMARK_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
] as const;

export type BookmarkColor = (typeof BOOKMARK_COLORS)[number];

export interface Space {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;  // Track server update time for checksum
  _syncVersion?: number;
}

export interface PinnedView {
  id: string;
  spaceId: string;
  name: string;
  searchQuery: string;
  tag: string;
  sortKey: "newest" | "oldest" | "title";
  createdAt: string;
  updatedAt?: string;  // Track server update time for checksum
  _syncVersion?: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  color?: BookmarkColor;
  createdAt: string;
  spaceId?: string;
  updatedAt?: string;  // Track server update time for checksum
  preview?: {
    faviconUrl: string | null;
    siteName: string | null;
    ogImageUrl: string | null;
    previewTitle: string | null;
    previewDescription: string | null;
    lastFetchedAt: number | null;
  };
  _syncVersion?: number;
}

export interface KdfParams {
  algorithm: 'PBKDF2';
  iterations: number;
  saltLength: number;
  keyLength: number;
}

export interface VaultKeyEnvelope {
  wrappedKey: string;
  salt: string;
  kdfParams: KdfParams;
  version: number;
}

export interface EncryptedRecord {
  recordId: string;
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
  deleted?: boolean;
}

export interface VaultEnableRequest {
  wrappedKey: string;
  salt: string;
  kdfParams: KdfParams;
}

// Sync Mode Types
export type SyncMode = 'off' | 'plaintext' | 'e2e';

export type RecordType = 'bookmark' | 'space' | 'pinned-view';

export interface SyncSettings {
  syncEnabled: boolean;
  syncMode: SyncMode;
  lastSyncAt?: string;
}

// Plaintext sync record (for non-E2E mode)
export interface PlaintextRecord {
  recordId: string;
  recordType: RecordType;
  data: Bookmark | Space | PinnedView;
  version: number;
  deleted: boolean;
  updatedAt: string;
}

// Sync operation for outbox queue
export interface SyncOperation {
  id: string;
  recordId: string;
  recordType: RecordType;
  baseVersion: number;
  // For E2E mode
  ciphertext?: string;
  // For plaintext mode
  data?: Bookmark | Space | PinnedView;
  deleted: boolean;
  createdAt: number;
  retries: number;
}

// Sync result types
export interface SyncPushResult {
  success: boolean;
  synced: number;
  conflicts: SyncConflict[];
  errors: string[];
  results?: { recordId: string; version: number; updatedAt: string }[];
  checksum?: string;
  checksumMeta?: {
    count: number;
    lastUpdate: string | null;
  };
}

export interface SyncPullResult {
  records: (PlaintextRecord | EncryptedRecord)[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface SyncConflict {
  recordId: string;
  recordType: RecordType;
  localVersion: number;
  serverVersion: number;
  serverData?: Bookmark | Space | PinnedView;
  serverCiphertext?: string;
}
