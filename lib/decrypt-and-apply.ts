import type { Bookmark, Space, PinnedView, RecordType } from '@/lib/types';
import { decryptData, base64ToArray, importVaultKey } from '@/lib/crypto';
import {
  clearPulledCiphertextRecords,
  loadPulledCiphertextRecords,
  type PulledCiphertextRecord,
} from '@/lib/encrypted-storage';
import { getBookmarks, setBookmarks, invalidateAllCaches } from '@/lib/storage';
import { getSpaces, setSpaces } from '@/lib/spacesStorage';
import { getPinnedViews, savePinnedViews } from '@/lib/pinnedViewsStorage';

function decodeJson<T>(bytes: Uint8Array): T {
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

async function decryptPulledRecord(
  record: PulledCiphertextRecord,
  vaultKey: Uint8Array
): Promise<{ recordType: RecordType; recordId: string; deleted: boolean; version: number; updatedAt: string; data: unknown | null }> {
  if (!record.ciphertext) {
    throw new Error('Missing ciphertext');
  }
  if (record.deleted) {
    return {
      recordType: record.recordType,
      recordId: record.recordId,
      deleted: true,
      version: record.version,
      updatedAt: record.updatedAt,
      data: null,
    };
  }

  // Ciphertext is stored as a single base64 string representing:
  // [12-byte iv][ciphertext...][16-byte tag]
  // This matches the format produced by `wrapVaultKey`.
  // NOTE: Older experimental builds stored JSON `{ iv, ciphertext, tag }`.
  const combined = base64ToArray(record.ciphertext);
  const iv = combined.slice(0, 12);
  const tag = combined.slice(-16);
  const ciphertext = combined.slice(12, -16);

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error(
      `Invalid ciphertext payload (recordId=${record.recordId}, recordType=${record.recordType}, length=${combined.length})`
    );
  }

  const key = await importVaultKey(vaultKey);
   let decrypted: Uint8Array;

   try {
     decrypted = await decryptData(
       {
         ciphertext,
         iv,
         tag,
       },
       key
     );
   } catch (error) {
     console.error('[e2e-sync] decrypt failed', {
       recordId: record.recordId,
       recordType: record.recordType,
       version: record.version,
       updatedAt: record.updatedAt,
       combinedLength: combined.length,
       error,
     });
     throw error;
   }


  return {
    recordType: record.recordType,
    recordId: record.recordId,
    deleted: false,
    version: record.version,
    updatedAt: record.updatedAt,
    data: decodeJson(decrypted),
  };
}

export async function decryptAndApplyPulledE2eRecords(vaultKey: Uint8Array): Promise<{ applied: number }> {
  const pulled = loadPulledCiphertextRecords();
  if (pulled.length === 0) return { applied: 0 };

  let bookmarks = getBookmarks();
  let spaces = getSpaces();
  let pinnedViews = getPinnedViews();

  const bookmarksById = new Map(bookmarks.map((b) => [b.id, b]));
  const spacesById = new Map(spaces.map((s) => [s.id, s]));
  const pinnedViewsById = new Map(pinnedViews.map((v) => [v.id, v]));

  let applied = 0;

  for (const record of pulled) {
    const decrypted = await decryptPulledRecord(record, vaultKey);

    if (decrypted.recordType === 'bookmark') {
      if (decrypted.deleted) {
        bookmarksById.delete(decrypted.recordId);
      } else {
        bookmarksById.set(decrypted.recordId, {
          ...(decrypted.data as Bookmark),
          _syncVersion: decrypted.version,
          updatedAt: decrypted.updatedAt,
        });
      }
      applied++;
    }

    if (decrypted.recordType === 'space') {
      if (decrypted.deleted) {
        spacesById.delete(decrypted.recordId);
      } else {
        spacesById.set(decrypted.recordId, {
          ...(decrypted.data as Space),
          _syncVersion: decrypted.version,
          updatedAt: decrypted.updatedAt,
        });
      }
      applied++;
    }

    if (decrypted.recordType === 'pinned-view') {
      if (decrypted.deleted) {
        pinnedViewsById.delete(decrypted.recordId);
      } else {
        pinnedViewsById.set(decrypted.recordId, {
          ...(decrypted.data as PinnedView),
          _syncVersion: decrypted.version,
          updatedAt: decrypted.updatedAt,
        });
      }
      applied++;
    }
  }

  bookmarks = Array.from(bookmarksById.values());
  spaces = Array.from(spacesById.values());
  pinnedViews = Array.from(pinnedViewsById.values());

  setBookmarks(bookmarks);
  setSpaces(spaces);
  savePinnedViews(pinnedViews);

  // Invalidate caches after writing decrypted data to localStorage
  // This ensures that subsequent reads will fetch fresh data instead of serving stale cache
  invalidateAllCaches();

  clearPulledCiphertextRecords();

  return { applied };
}
