import type { Bookmark, SyncMode } from '@/lib/types';
import { encryptData, importVaultKey, arrayToBase64 } from '@/lib/crypto';

interface BatchSyncOptions {
  syncMode: SyncMode;
  vaultKey: Uint8Array | null;
}

interface PlaintextBatchRecord {
  recordId: string;
  data: Bookmark;
}

interface EncryptedBatchRecord {
  recordId: string;
  ciphertext: string;
}

interface BatchSyncResult {
  success: boolean;
  synced: number;
  error?: string;
}

/**
 * Batch sync affected bookmarks after a tag operation.
 * Supports both plaintext and E2E modes.
 *
 * @param bookmarks - The affected bookmarks to sync
 * @param options - Sync options including mode and vault key
 * @returns Result of the batch sync operation
 */
export async function batchSyncBookmarks(
  bookmarks: Bookmark[],
  options: BatchSyncOptions
): Promise<BatchSyncResult> {
  const { syncMode, vaultKey } = options;

  // Skip sync if mode is off or no bookmarks
  if (syncMode === 'off' || bookmarks.length === 0) {
    return { success: true, synced: 0 };
  }

  try {
    if (syncMode === 'plaintext') {
      // Plaintext mode: send data directly
      const records: PlaintextBatchRecord[] = bookmarks.map((bookmark) => ({
        recordId: bookmark.id,
        data: bookmark,
      }));

      const response = await fetch('/api/tags/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'plaintext',
          records,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          synced: 0,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        synced: result.synced,
      };
    } else if (syncMode === 'e2e') {
      // E2E mode: encrypt each bookmark before sending
      if (!vaultKey) {
        return {
          success: false,
          synced: 0,
          error: 'Vault key required for E2E sync',
        };
      }

      const cryptoKey = await importVaultKey(vaultKey);
      const records: EncryptedBatchRecord[] = [];

      for (const bookmark of bookmarks) {
        const encoder = new TextEncoder();
        const plaintext = encoder.encode(JSON.stringify(bookmark));
        const encrypted = await encryptData(plaintext, cryptoKey);

        // Combine iv + ciphertext + tag into single base64 string
        const combined = new Uint8Array(
          encrypted.iv.length + encrypted.ciphertext.length + encrypted.tag.length
        );
        combined.set(encrypted.iv, 0);
        combined.set(encrypted.ciphertext, encrypted.iv.length);
        combined.set(encrypted.tag, encrypted.iv.length + encrypted.ciphertext.length);

        records.push({
          recordId: bookmark.id,
          ciphertext: arrayToBase64(combined),
        });
      }

      const response = await fetch('/api/tags/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'e2e',
          records,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          synced: 0,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        synced: result.synced,
      };
    }

    return { success: true, synced: 0 };
  } catch (error) {
    console.error('Batch sync error:', error);
    return {
      success: false,
      synced: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
