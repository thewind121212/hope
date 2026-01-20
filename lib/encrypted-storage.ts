import * as crypto from './crypto';
import type { Bookmark, Space, PinnedView, RecordType } from './types';

const ENCRYPTED_STORAGE_KEY = 'bookmark-vault-encrypted';
const ENCRYPTED_SPACES_KEY = 'bookmark-vault-encrypted-spaces';
const ENCRYPTED_PINNED_VIEWS_KEY = 'bookmark-vault-encrypted-pinned-views';

export interface StoredEncryptedRecord {
  recordId: string;
  recordType: RecordType;
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Generic encrypted record storage
function getStorageKey(recordType: RecordType): string {
  switch (recordType) {
    case 'bookmark': return ENCRYPTED_STORAGE_KEY;
    case 'space': return ENCRYPTED_SPACES_KEY;
    case 'pinned-view': return ENCRYPTED_PINNED_VIEWS_KEY;
  }
}

export function loadAllEncryptedRecords(recordType?: RecordType): StoredEncryptedRecord[] {
  if (typeof window === 'undefined') return [];

  if (recordType) {
    const key = getStorageKey(recordType);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Load all record types
  const allRecords: StoredEncryptedRecord[] = [];
  const types: RecordType[] = ['bookmark', 'space', 'pinned-view'];
  for (const type of types) {
    allRecords.push(...loadAllEncryptedRecords(type));
  }
  return allRecords;
}

export function saveEncryptedRecord(record: StoredEncryptedRecord): void {
  const key = getStorageKey(record.recordType);
  const records = loadAllEncryptedRecords(record.recordType);
  const index = records.findIndex((r) => r.recordId === record.recordId);

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  localStorage.setItem(key, JSON.stringify(records));
}

export function deleteEncryptedRecord(recordId: string, recordType: RecordType): void {
  const key = getStorageKey(recordType);
  const records = loadAllEncryptedRecords(recordType);
  const filtered = records.filter((r) => r.recordId !== recordId);
  localStorage.setItem(key, JSON.stringify(filtered));
}

// Generic encrypt and save function
async function encryptAndSaveRecord<T extends { id: string; createdAt: string }>(
  data: T,
  recordType: RecordType,
  vaultKey: Uint8Array
): Promise<StoredEncryptedRecord> {
  const encryptionKey = await crypto.importVaultKey(vaultKey);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.encryptData(plaintext, encryptionKey);

  const existing = loadAllEncryptedRecords(recordType);
  const existingRecord = existing.find((r) => r.recordId === data.id);
  const version = existingRecord ? existingRecord.version + 1 : 1;

  const record: StoredEncryptedRecord = {
    recordId: data.id,
    recordType,
    ciphertext: crypto.arrayToBase64(encrypted.ciphertext),
    iv: crypto.arrayToBase64(encrypted.iv),
    tag: crypto.arrayToBase64(encrypted.tag),
    version,
    deleted: false,
    createdAt: data.createdAt,
    updatedAt: new Date().toISOString(),
  };

  saveEncryptedRecord(record);
  return record;
}

// Bookmark encryption
export async function encryptAndSaveBookmark(
  bookmark: Bookmark,
  vaultKey: Uint8Array
): Promise<StoredEncryptedRecord> {
  return encryptAndSaveRecord(bookmark, 'bookmark', vaultKey);
}

// Space encryption
export async function encryptAndSaveSpace(
  space: Space,
  vaultKey: Uint8Array
): Promise<StoredEncryptedRecord> {
  return encryptAndSaveRecord(space, 'space', vaultKey);
}

// PinnedView encryption
export async function encryptAndSavePinnedView(
  pinnedView: PinnedView,
  vaultKey: Uint8Array
): Promise<StoredEncryptedRecord> {
  return encryptAndSaveRecord(pinnedView, 'pinned-view', vaultKey);
}

// Generic decrypt function
async function decryptRecord<T>(
  record: StoredEncryptedRecord,
  vaultKey: Uint8Array
): Promise<T | null> {
  if (record.deleted) return null;

  const encryptionKey = await crypto.importVaultKey(vaultKey);
  const ciphertext = crypto.base64ToArray(record.ciphertext);
  const iv = crypto.base64ToArray(record.iv);
  const tag = crypto.base64ToArray(record.tag);

  const decrypted = await crypto.decryptData(
    { ciphertext, iv, tag },
    encryptionKey
  );

  const plaintext = new TextDecoder().decode(decrypted);
  return JSON.parse(plaintext) as T;
}

export async function loadAndDecryptBookmark(
  recordId: string,
  vaultKey: Uint8Array
): Promise<Bookmark | null> {
  const records = loadAllEncryptedRecords('bookmark');
  const record = records.find((r) => r.recordId === recordId);
  if (!record) return null;
  return decryptRecord<Bookmark>(record, vaultKey);
}

export async function loadAndDecryptSpace(
  recordId: string,
  vaultKey: Uint8Array
): Promise<Space | null> {
  const records = loadAllEncryptedRecords('space');
  const record = records.find((r) => r.recordId === recordId);
  if (!record) return null;
  return decryptRecord<Space>(record, vaultKey);
}

export async function loadAndDecryptPinnedView(
  recordId: string,
  vaultKey: Uint8Array
): Promise<PinnedView | null> {
  const records = loadAllEncryptedRecords('pinned-view');
  const record = records.find((r) => r.recordId === recordId);
  if (!record) return null;
  return decryptRecord<PinnedView>(record, vaultKey);
}

export async function loadAndDecryptAllBookmarks(
  vaultKey: Uint8Array
): Promise<Bookmark[]> {
  const records = loadAllEncryptedRecords('bookmark');
  const bookmarks: Bookmark[] = [];

  for (const record of records) {
    if (record.deleted) continue;
    const bookmark = await decryptRecord<Bookmark>(record, vaultKey);
    if (bookmark) bookmarks.push(bookmark);
  }

  return bookmarks;
}

export async function loadAndDecryptAllSpaces(
  vaultKey: Uint8Array
): Promise<Space[]> {
  const records = loadAllEncryptedRecords('space');
  const spaces: Space[] = [];

  for (const record of records) {
    if (record.deleted) continue;
    const space = await decryptRecord<Space>(record, vaultKey);
    if (space) spaces.push(space);
  }

  return spaces;
}

export async function loadAndDecryptAllPinnedViews(
  vaultKey: Uint8Array
): Promise<PinnedView[]> {
  const records = loadAllEncryptedRecords('pinned-view');
  const views: PinnedView[] = [];

  for (const record of records) {
    if (record.deleted) continue;
    const view = await decryptRecord<PinnedView>(record, vaultKey);
    if (view) views.push(view);
  }

  return views;
}

export function hasEncryptedStorage(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
  return raw !== null && raw !== '';
}

// Migration helpers
export interface MigrationData {
  bookmarks: Bookmark[];
  spaces: Space[];
  pinnedViews: PinnedView[];
}

export interface MigrationProgress {
  total: number;
  completed: number;
  currentType: RecordType | null;
}

export async function migrateAllToEncrypted(
  data: MigrationData,
  vaultKey: Uint8Array,
  onProgress?: (progress: MigrationProgress) => void
): Promise<StoredEncryptedRecord[]> {
  const total = data.bookmarks.length + data.spaces.length + data.pinnedViews.length;
  let completed = 0;
  const records: StoredEncryptedRecord[] = [];

  // Encrypt bookmarks
  for (const bookmark of data.bookmarks) {
    onProgress?.({ total, completed, currentType: 'bookmark' });
    const record = await encryptAndSaveBookmark(bookmark, vaultKey);
    records.push(record);
    completed++;
  }

  // Encrypt spaces
  for (const space of data.spaces) {
    onProgress?.({ total, completed, currentType: 'space' });
    const record = await encryptAndSaveSpace(space, vaultKey);
    records.push(record);
    completed++;
  }

  // Encrypt pinned views
  for (const pinnedView of data.pinnedViews) {
    onProgress?.({ total, completed, currentType: 'pinned-view' });
    const record = await encryptAndSavePinnedView(pinnedView, vaultKey);
    records.push(record);
    completed++;
  }

  onProgress?.({ total, completed, currentType: null });
  return records;
}

export async function migrateToEncrypted(
  bookmarks: Bookmark[],
  vaultKey: Uint8Array
): Promise<void> {
  for (const bookmark of bookmarks) {
    await encryptAndSaveBookmark(bookmark, vaultKey);
  }
}

export function rollbackMigration(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  localStorage.removeItem(ENCRYPTED_SPACES_KEY);
  localStorage.removeItem(ENCRYPTED_PINNED_VIEWS_KEY);
}

export function clearPlaintextStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('bookmark-vault-bookmarks');
  localStorage.removeItem('bookmark-vault-spaces');
  localStorage.removeItem('bookmark-vault-pinned-views');
  localStorage.removeItem('bookmark-vault-previews');
}
