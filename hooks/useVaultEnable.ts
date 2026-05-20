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
import { getBookmarks, setBookmarks } from '@/lib/storage';
import { getSpaces, setSpaces } from '@/lib/spacesStorage';
import { getPinnedViews, savePinnedViews } from '@/lib/pinnedViewsStorage';
import { syncPush } from '@/lib/sync-engine';
import { addToOutbox } from '@/lib/sync-outbox';
import type { RecordType } from '@/lib/types';

export interface VaultEnableProgress {
  phase: 'generating' | 'encrypting' | 'syncing' | 'cleanup' | 'complete' | 'error';
  encryptProgress?: MigrationProgress;
  syncProgress?: number;
  error?: string;
  recoveryCodes?: string[];
}

export interface DataCounts {
  bookmarks: number;
  spaces: number;
  pinnedViews: number;
  total: number;
}

export interface PreparedVault {
  vaultKey: Uint8Array;
  envelope: any;
  recoveryCodes: string[];
}

/**
 * Merge two ID-keyed arrays so the second list wins per-id. Used to fold
 * cross-tab edits made during the enable window back into the post-enable
 * plaintext snapshot.
 */
function mergeById<T extends { id: string }>(snapshot: T[], latest: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of snapshot) byId.set(item.id, item);
  for (const item of latest) byId.set(item.id, item);
  return Array.from(byId.values());
}

export function useVaultEnable(options?: { deletePlaintextCloudAfterEnable?: boolean }) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [progress, setProgress] = useState<VaultEnableProgress | null>(null);
  const [preparedVault, setPreparedVault] = useState<PreparedVault | null>(null);
  const { setEnvelope, setUnlocked, clearEnvelope } = useVaultStore();

  const deletePlaintextCloudAfterEnable = options?.deletePlaintextCloudAfterEnable ?? false;

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  const resetPreparedVault = useCallback(() => {
    setPreparedVault(null);
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

  /**
   * Phase 1: Generate vault key and recovery codes (instant, no side effects)
   */
  const prepareVault = useCallback(async (passphrase: string): Promise<PreparedVault> => {
    setIsEnabling(true);
    setProgress({ phase: 'generating' });

    try {
      // Generate vault key
      const vaultKey = await crypto.generateVaultKey();

      // Create envelope with recovery codes
      const { envelope, recoveryCodes } = await crypto.createKeyEnvelope(
        passphrase,
        vaultKey,
        true
      );

      // Verify passphrase works
      const testKey = await crypto.unwrapVaultKeyFromEnvelope(envelope, passphrase);
      if (!testKey) {
        throw new Error('Passphrase verification failed');
      }

      // Store prepared vault
      const prepared: PreparedVault = { vaultKey, envelope, recoveryCodes };
      setPreparedVault(prepared);

      // Update progress with codes (triggers UI to show RecoveryCodeDisplay)
      setProgress({ phase: 'generating', recoveryCodes });

      return prepared;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare vault';
      setProgress({ phase: 'error', error: errorMessage });
      throw error;
    } finally {
      setIsEnabling(false);
    }
  }, []);

  /**
   * Phase 2: Execute encryption and sync (irreversible)
   */
  const executeVaultEnable = useCallback(async (prepared: PreparedVault): Promise<void> => {
    setIsEnabling(true);
    setProgress({ phase: 'encrypting' });

    let encryptedRecords: StoredEncryptedRecord[] = [];

    // Capture the previous sync mode so the catch block can revert it
    // cleanly if the enable flow fails midway.
    const previousSyncMode = useSyncSettingsStore.getState().syncMode;

    // Suppress background sync engines while the transition runs so they
    // can't race the enable flow and clobber in-flight data.
    useVaultStore.getState().setTransitionInProgress(true);

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

      const { vaultKey, envelope } = prepared;

      // Phase 2: Encrypt all local data
      setProgress({ phase: 'encrypting' });

      // Read bookmarks directly from storage
      const bookmarks = getBookmarks();
      const spaces = getSpaces();
      const pinnedViews = getPinnedViews();

      // W1: refuse to encrypt-empty when the server is known to hold data.
      // If we have nothing locally but the server says it has been synced
      // before, the user probably opened a fresh device and the pull
      // hasn't landed yet. Encrypting empty here would push empty over
      // their real bookmarks.
      const allEmpty =
        bookmarks.length === 0 && spaces.length === 0 && pinnedViews.length === 0;
      const hasServerHistory = !!useSyncSettingsStore.getState().lastSyncAt;
      if (allEmpty && hasServerHistory) {
        throw new Error(
          'Refusing to enable vault: no local bookmarks but server has prior data. Wait for sync to finish, then try again.',
        );
      }

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

      // Persist syncMode='e2e' on the server BEFORE pushing any ciphertext.
      // If this fails we abort: pushing E2E ops while server still thinks the
      // mode is 'plaintext' leaves an inconsistent server view that next pull
      // would misinterpret.
      const { setSyncMode, saveToServer } = useSyncSettingsStore.getState();
      setSyncMode('e2e');
      try {
        await saveToServer();
      } catch (err) {
        throw new Error(
          `Failed to persist sync mode on server: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }

      // W4: if the user signed out (currentUserId cleared) while we were
      // talking to the server, bail before doing any more destructive work.
      if (!useVaultStore.getState().currentUserId) {
        throw new Error('User signed out during vault enable. Aborting.');
      }

      // Phase 4: Delete any existing encrypted records on server.
      // CRITICAL: Old records were encrypted with a different vault key and
      // cannot be decrypted with the new key. We MUST verify the server
      // accepted the delete before pushing fresh ciphertext, otherwise
      // residual rows from a previous vault collide with the new ones.
      setProgress({ phase: 'syncing', syncProgress: 0 });

      const deleteEncryptedRes = await fetch('/api/vault/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-encrypted' }),
      });

      if (!deleteEncryptedRes.ok) {
        const data = await deleteEncryptedRes.json().catch(() => ({}));
        throw new Error(
          data.error
            ? `Failed to clear existing encrypted records: ${data.error}`
            : 'Failed to clear existing encrypted records from server',
        );
      }

      // NOTE: Previously we cleared `vault-sync-outbox` here to drop ops
      // from a prior failed vault attempt. That also discarded legitimate
      // pending ops from the current session. We now leave the outbox alone:
      // addToOutbox below appends, and the upcoming syncPush will fail/retry
      // any genuinely stale entries instead of silently losing user edits.

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

       // Phase 7: Cleanup client plaintext storage, then restore a decrypted
       // working copy. Re-read plaintext from disk before overwriting so any
       // edits made in another tab during the encrypt+push window are merged
       // in instead of being clobbered by the in-memory snapshot.
       const latestBookmarks = getBookmarks();
       const latestSpaces = getSpaces();
       const latestPinnedViews = getPinnedViews();
       const mergedBookmarks = mergeById(bookmarks, latestBookmarks);
       const mergedSpaces = mergeById(spaces, latestSpaces);
       const mergedPinnedViews = mergeById(pinnedViews, latestPinnedViews);

       clearPlaintextStorage();
       setBookmarks(mergedBookmarks);
       setSpaces(mergedSpaces);
       savePinnedViews(mergedPinnedViews);


      // Done!
      setProgress({ phase: 'complete' });
    } catch (error) {
      // Rollback on error: clear encrypted local store AND revert the local
      // sync mode + envelope so the app does not land in a half-flipped
      // state where syncMode='e2e' but there is no usable vault.
      rollbackMigration();
      try {
        useSyncSettingsStore.getState().setSyncMode(previousSyncMode);
        await useSyncSettingsStore.getState().saveToServer();
      } catch (revertErr) {
        console.warn('[vault-enable] mode revert failed', revertErr);
      }
      try {
        clearEnvelope();
        useVaultStore.getState().lock();
      } catch (envErr) {
        console.warn('[vault-enable] envelope clear failed', envErr);
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to enable vault';
      setProgress({ phase: 'error', error: errorMessage });
      // Don't re-throw - the progress state will show the error to the user
    } finally {
      useVaultStore.getState().setTransitionInProgress(false);
      setIsEnabling(false);
    }
  }, [setEnvelope, setUnlocked, clearEnvelope, deletePlaintextCloudAfterEnable]);

  return {
    prepareVault,
    executeVaultEnable,
    preparedVault,
    resetPreparedVault,
    isEnabling,
    progress,
    resetProgress,
    getDataCounts,
  };
}
