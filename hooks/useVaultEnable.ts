"use client";

import { useState, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import * as crypto from '@/lib/crypto';
import { 
  migrateAllToEncrypted, 
  rollbackMigration,
  clearPlaintextStorage,
  clearAllEncryptedStorage,
  type MigrationProgress,
  type StoredEncryptedRecord,
} from '@/lib/encrypted-storage';
import { getBookmarks } from '@/lib/storage';
import { getSpaces } from '@/lib/spacesStorage';
import { getPinnedViews } from '@/lib/pinnedViewsStorage';
import { syncPush } from '@/lib/sync-engine';
import { addToOutbox } from '@/lib/sync-outbox';
import type { RecordType } from '@/lib/types';

export interface VaultEnableProgress {
  phase: 'generating' | 'encrypting' | 'syncing' | 'cleanup' | 'complete' | 'error';
  encryptProgress?: MigrationProgress;
  syncProgress?: number;
  error?: string;
}

export interface DataCounts {
  bookmarks: number;
  spaces: number;
  pinnedViews: number;
  total: number;
}

export function useVaultEnable(options?: { deletePlaintextCloudAfterEnable?: boolean }) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [progress, setProgress] = useState<VaultEnableProgress | null>(null);
  const { setEnvelope, setUnlocked, clearEnvelope } = useVaultStore();

  const deletePlaintextCloudAfterEnable = options?.deletePlaintextCloudAfterEnable ?? false;

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  // Get current data counts (read directly from storage)
  const getDataCounts = useCallback((): DataCounts => {
    const bookmarks = getBookmarks().length;
    const spaces = getSpaces().length;
    const pinnedViews = getPinnedViews().length;
    return {
      bookmarks,
      spaces,
      pinnedViews,
      total: bookmarks + spaces + pinnedViews,
    };
  }, []);

  const enableVault = useCallback(async (passphrase: string): Promise<void> => {
    setIsEnabling(true);
    setProgress({ phase: 'generating' });

    let vaultKey: Uint8Array | null = null;
    let encryptedRecords: StoredEncryptedRecord[] = [];

    try {
      // CRITICAL: Clear any stale data from previous vault attempts.
      // This includes:
      // - Old envelope (if switching from a previous E2E setup)
      // - Local encrypted records (encrypted with old key)
      // - Pulled ciphertext cache (from server, encrypted with old key)
      // - Sync outbox entries (stale operations)
      // This ensures a clean slate for the new vault and prevents decryption errors.
      clearEnvelope();
      clearAllEncryptedStorage();
      
      // Phase 1: Generate vault key and create envelope
      vaultKey = await crypto.generateVaultKey();
      const envelope = await crypto.createKeyEnvelope(passphrase, vaultKey);

      // Verify passphrase works
      const testKey = await crypto.unwrapVaultKeyFromEnvelope(envelope, passphrase);
      if (!testKey) {
        throw new Error('Passphrase verification failed');
      }

      // Phase 2: Encrypt all local data
      setProgress({ phase: 'encrypting' });
      
      // Read bookmarks directly from storage
      const bookmarks = getBookmarks();
      const spaces = getSpaces();
      const pinnedViews = getPinnedViews();

      console.log('[vault-enable] Data to encrypt:', {
        bookmarks: bookmarks.length,
        spaces: spaces.length,
        pinnedViews: pinnedViews.length,
        pinnedViewsData: pinnedViews,
      });

      encryptedRecords = await migrateAllToEncrypted(
        {
          bookmarks,
          spaces,
          pinnedViews,
        },
        vaultKey,
        (encryptProgress) => {
          setProgress({ phase: 'encrypting', encryptProgress });
        }
      );

      console.log('[vault-enable] Encrypted records created:', {
        total: encryptedRecords.length,
        byType: {
          bookmarks: encryptedRecords.filter(r => r.recordType === 'bookmark').length,
          spaces: encryptedRecords.filter(r => r.recordType === 'space').length,
          pinnedViews: encryptedRecords.filter(r => r.recordType === 'pinned-view').length,
        },
        recordTypes: encryptedRecords.map(r => ({ id: r.recordId, type: r.recordType })),
      });

      // Phase 3: Enable vault on server
      const response = await fetch('/api/vault/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enable vault on server');
      }

      // Set vault state
      setEnvelope(envelope);
      setUnlocked(true, vaultKey);

      // Set sync mode to e2e and save to server immediately.
      // This prevents the race condition where loadFromServer() in SyncModeToggle
      // could overwrite the mode with the old 'plaintext' value before the modal closes.
      const { setSyncMode, saveToServer } = useSyncSettingsStore.getState();
      setSyncMode('e2e');
      try {
        await saveToServer();
      } catch (err) {
        console.warn('[vault-enable] Failed to save sync settings to server:', err);
        // Continue anyway - local state is correct, will sync on next opportunity
      }

      // NOTE: Sync mode is set to 'e2e' above. The settings UI no longer needs to
      // finalize the mode switch on modal close.

      // Phase 4: Delete any existing encrypted records on server.
      // CRITICAL: Old records were encrypted with a different vault key and cannot
      // be decrypted with the new key. We must delete them before pushing new ones.
      setProgress({ phase: 'syncing', syncProgress: 0 });

      const deleteEncryptedRes = await fetch('/api/vault/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-encrypted' }),
      });

      if (!deleteEncryptedRes.ok) {
        console.warn('Failed to delete existing encrypted records from server');
      }

      // Clear any stale outbox entries from previous vault attempts
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vault-sync-outbox');
      }

      // Phase 5: Queue all encrypted records for sync
      
      for (let i = 0; i < encryptedRecords.length; i++) {
        const record = encryptedRecords[i];
        // Server expects ciphertext to contain iv+tag metadata.
        // Local encrypted storage keeps `ciphertext`, `iv`, `tag` split.
        const ivBytes = crypto.base64ToArray(record.iv);
        const ciphertextBytes = crypto.base64ToArray(record.ciphertext);
        const tagBytes = crypto.base64ToArray(record.tag);

        const combined = new Uint8Array(ivBytes.length + ciphertextBytes.length + tagBytes.length);
        combined.set(ivBytes, 0);
        combined.set(ciphertextBytes, ivBytes.length);
        combined.set(tagBytes, ivBytes.length + ciphertextBytes.length);

        // Server uses last-write-wins, baseVersion is ignored
        addToOutbox({
          recordId: record.recordId,
          recordType: record.recordType as RecordType,
          baseVersion: 0,
          ciphertext: crypto.arrayToBase64(combined),
          deleted: false,
        });
        setProgress({ 
          phase: 'syncing', 
          syncProgress: Math.round(((i + 1) / encryptedRecords.length) * 50) 
        });
      }

      // Push to server
      const pushResult = await syncPush();
      setProgress({ phase: 'syncing', syncProgress: 100 });

      if (!pushResult.success && pushResult.conflicts.length > 0) {
        console.warn('Some records had conflicts during initial sync:', pushResult.conflicts);
      }

       // Phase 6: Optional cleanup server plaintext records
       setProgress({ phase: 'cleanup' });

       if (deletePlaintextCloudAfterEnable) {
         // Delete plaintext dataset only when explicitly requested.
         const deletePlaintextRes = await fetch('/api/vault/disable', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: 'delete-plaintext' }),
         });

         if (!deletePlaintextRes.ok) {
           console.warn('Failed to delete plaintext records from server');
         }
       }

       // IMPORTANT: before clearing local plaintext storage, verify we can decrypt
       // at least one encrypted record we just uploaded.
       if (encryptedRecords.length > 0) {
         try {
           const key = await crypto.importVaultKey(vaultKey);
           const sample = encryptedRecords[0];
           const ivBytes = crypto.base64ToArray(sample.iv);
           const ciphertextBytes = crypto.base64ToArray(sample.ciphertext);
           const tagBytes = crypto.base64ToArray(sample.tag);
           const decrypted = await crypto.decryptData(
             { iv: ivBytes, ciphertext: ciphertextBytes, tag: tagBytes },
             key
           );
           JSON.parse(new TextDecoder().decode(decrypted));
         } catch (error) {
           console.error('[vault-enable] sanity decrypt failed; aborting cleanup', error);
           throw new Error('Vault enabled, but verification decryption failed. Aborting cleanup.');
         }
       }

       // Phase 7: Cleanup client plaintext storage
       clearPlaintextStorage();


      // Done!
      setProgress({ phase: 'complete' });
    } catch (error) {
      // Rollback on error
      rollbackMigration();
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable vault';
      setProgress({ phase: 'error', error: errorMessage });
      // Don't re-throw - the progress state will show the error to the user
    } finally {
      setIsEnabling(false);
    }
  }, [setEnvelope, setUnlocked, clearEnvelope, deletePlaintextCloudAfterEnable]);

  return { 
    enableVault, 
    isEnabling, 
    progress,
    resetProgress,
    getDataCounts,
  };
}
