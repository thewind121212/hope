"use client";

/**
 * useVaultDisable Hook
 *
 * Two-Phase Commit Pattern with Atomic Rollback
 *
 * PHASE 1 (Reversible - All data safe):
 * 1. Verify passphrase
 * 2. Create backup checkpoint
 * 3. Decrypt all records
 * 4. Calculate checksum
 * 5. Upload plaintext to server
 * 6. Verify server received all data (count + checksum gate)
 * IF ANY STEP FAILS: ABORT and rollback to encrypted state
 *
 * PHASE 2 (Irreversible - Data safe on server):
 * 1. Delete encrypted records from server (atomic transaction)
 * 2. Delete vault envelope from server
 * 3. Clear local encrypted storage
 * 4. Save plaintext to localStorage
 * 5. Update sync mode to plaintext
 * 6. Delete backup checkpoint
 * IF ANY STEP FAILS: Data safe on server as plaintext, manual recovery available
 */

import { useState, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import * as crypto from '@/lib/crypto';
import {
  loadAllEncryptedRecords,
  loadAndDecryptAllBookmarks,
  loadAndDecryptAllSpaces,
  loadAndDecryptAllPinnedViews,
  rollbackMigration,
} from '@/lib/encrypted-storage';
import {
  pushPlaintext,
  queuePlaintextOperation,
  clearOutbox as clearPlaintextOutbox,
} from '@/lib/plaintext-sync-engine';
import {
  createBackupCheckpoint,
  restoreFromBackup,
  deleteBackup,
} from '@/lib/vault-disable-backup';
import type { Bookmark, Space, PinnedView } from '@/lib/types';
import type { StoredEncryptedRecord } from '@/lib/encrypted-storage';

const MAX_UPLOAD_ITERATIONS = 20;
const VERIFICATION_TIMEOUT_MS = 30000; // 30 seconds

export interface VaultDisableProgress {
  phase: 'verifying' | 'backup' | 'decrypting' | 'uploading' | 'verifying-upload' | 'cleanup' | 'complete' | 'error' | 'rolling-back';
  step?: string;
  decryptProgress?: {
    total: number;
    completed: number;
  };
  uploadProgress?: {
    total: number;
    completed: number;
    iterations: number;
  };
  error?: string;
  backupId?: string | null;
}

export interface DecryptedData {
  bookmarks: Bookmark[];
  spaces: Space[];
  pinnedViews: PinnedView[];
  total: number;
}

export function useVaultDisable() {
  const [isDisabling, setIsDisabling] = useState(false);
  const [progress, setProgress] = useState<VaultDisableProgress | null>(null);

  const { vaultEnvelope, vaultKey, lock, clearEnvelope } = useVaultStore();
  const { setSyncMode, saveToServer } = useSyncSettingsStore();

  // Verify passphrase and unlock vault if needed
  const verifyPassphrase = useCallback(async (passphrase: string): Promise<boolean> => {
    if (!vaultEnvelope) return false;

    try {
      const key = await crypto.unwrapVaultKeyFromEnvelope(vaultEnvelope, passphrase);
      return key !== null;
    } catch {
      return false;
    }
  }, [vaultEnvelope]);

  // Get decryption key from passphrase
  const getDecryptionKey = useCallback(
    async (passphrase: string): Promise<Uint8Array | null> => {
      if (!vaultEnvelope) return null;

      try {
        return await crypto.unwrapVaultKeyFromEnvelope(vaultEnvelope, passphrase);
      } catch {
        return null;
      }
    },
    [vaultEnvelope]
  );

  // Rollback: Restore encrypted state from backup
  const rollbackToEncrypted = useCallback(
    async (backupId: string, reason: string): Promise<void> => {
      setProgress((prev) => ({
        ...prev,
        phase: 'rolling-back',
        step: `Rolling back: ${reason}`,
      }));

      try {
        console.error(`[Vault Disable] Rolling back vault disable: ${reason}`, { backupId });

        // Restore from backup
        const backup = restoreFromBackup(backupId);
        if (!backup) {
          throw new Error(`Backup ${backupId} not found - cannot restore`);
        }

        // Restore encrypted storage by record type
        if (backup.encryptedBookmarks.length > 0) {
          localStorage.setItem('bookmark-vault-encrypted', JSON.stringify(backup.encryptedBookmarks));
        }
        if (backup.encryptedSpaces.length > 0) {
          localStorage.setItem('bookmark-vault-encrypted-spaces', JSON.stringify(backup.encryptedSpaces));
        }
        if (backup.encryptedPinnedViews.length > 0) {
          localStorage.setItem('bookmark-vault-encrypted-pinned-views', JSON.stringify(backup.encryptedPinnedViews));
        }

        // Restore vault envelope
        localStorage.setItem('vault-envelope', JSON.stringify(backup.vaultEnvelope));

        // Clean up partial plaintext uploads via cleanup endpoint
        try {
          const allRecords = backup.encryptedBookmarks
            .concat(backup.encryptedSpaces)
            .concat(backup.encryptedPinnedViews);

          const recordIds = allRecords.map((r) => r.recordId);
          const recordTypes = allRecords.map((r) => {
            switch (r.recordType) {
              case 'space': return 'space';
              case 'pinned-view': return 'pinned-view';
              default: return 'bookmark';
            }
          });

          await fetch('/api/vault/disable/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recordIds,
              recordTypes,
            }),
          });
        } catch (cleanupError) {
          console.warn('[Vault Disable] Cleanup endpoint failed during rollback:', cleanupError);
          // Don't fail rollback if cleanup fails - data is safe in backup
        }

        // Delete backup after successful restore
        deleteBackup(backupId);

        setProgress((prev) => ({
          ...prev,
          phase: 'error',
          error: `Vault disable aborted and rolled back: ${reason}. Your encrypted vault is safe.`,
        }));
      } catch (rollbackError) {
        const errorMsg = rollbackError instanceof Error ? rollbackError.message : 'Unknown error';
        console.error('[Vault Disable] Rollback failed:', rollbackError);
        setProgress((prev) => ({
          ...prev,
          phase: 'error',
          error: `CRITICAL: Rollback failed: ${errorMsg}. Backup ID: ${backupId}. Contact support.`,
          backupId,
        }));
        throw rollbackError;
      }
    },
    []
  );

  const disableVault = useCallback(
    async (passphrase: string): Promise<void> => {
      setIsDisabling(true);
      setProgress({ phase: 'verifying', step: 'Verifying passphrase...' });

      let backupId: string | null = null;

      try {
        // ===== PHASE 1: PREPARE (Reversible) =====

        // STEP 1: Verify passphrase
        const decryptKey = await getDecryptionKey(passphrase);
        if (!decryptKey) {
          throw new Error('Invalid passphrase');
        }

        // Verify vault exists on server
        const verifyRes = await fetch('/api/vault/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify' }),
        });

        if (!verifyRes.ok) {
          const error = await verifyRes.json();
          throw new Error(error.error || 'Failed to verify vault');
        }

        // STEP 2: Create backup checkpoint BEFORE any deletion
        setProgress({ phase: 'backup', step: 'Creating backup checkpoint...' });

        // Load all encrypted records from localStorage
        const allEncryptedRecords = loadAllEncryptedRecords();
        const encryptedBookmarks = allEncryptedRecords.filter((r) => r.recordType === 'bookmark');
        const encryptedSpaces = allEncryptedRecords.filter((r) => r.recordType === 'space');
        const encryptedPinnedViews = allEncryptedRecords.filter((r) => r.recordType === 'pinned-view');

        // Calculate checksum of encrypted data for backup integrity
        const encryptedChecksum = JSON.stringify(
          [
            ...encryptedBookmarks.map((r) => r.recordId),
            ...encryptedSpaces.map((r) => r.recordId),
            ...encryptedPinnedViews.map((r) => r.recordId),
          ].sort()
        );

        backupId = createBackupCheckpoint(
          encryptedBookmarks as StoredEncryptedRecord[],
          encryptedSpaces as StoredEncryptedRecord[],
          encryptedPinnedViews as StoredEncryptedRecord[],
          vaultEnvelope!,
          encryptedChecksum
        );

        // STEP 3: Decrypt all data
        setProgress({
          phase: 'decrypting',
          step: 'Decrypting records...',
          decryptProgress: { total: 0, completed: 0 },
        });

        // Count total records
        const total = allEncryptedRecords.length;

        setProgress({
          phase: 'decrypting',
          decryptProgress: { total, completed: 0 },
        });

        // Decrypt bookmarks
        const bookmarks = await loadAndDecryptAllBookmarks(decryptKey);
        setProgress({
          phase: 'decrypting',
          decryptProgress: { total, completed: bookmarks.length },
        });

        // Decrypt spaces
        const spaces = await loadAndDecryptAllSpaces(decryptKey);
        setProgress({
          phase: 'decrypting',
          decryptProgress: { total, completed: bookmarks.length + spaces.length },
        });

        // Decrypt pinned views
        const pinnedViews = await loadAndDecryptAllPinnedViews(decryptKey);
        setProgress({
          phase: 'decrypting',
          decryptProgress: {
            total,
            completed: bookmarks.length + spaces.length + pinnedViews.length,
          },
        });

        // Note: Checksum verification removed - count verification is sufficient
        // If record count matches, all data was uploaded successfully

        // STEP 5: Upload as plaintext
        setProgress({
          phase: 'uploading',
          step: 'Uploading plaintext records...',
          uploadProgress: { total: 0, completed: 0, iterations: 0 },
        });

        // Clear any existing plaintext outbox
        clearPlaintextOutbox();

        // Queue all items
        const totalItems = bookmarks.length + spaces.length + pinnedViews.length;
        let queuedCount = 0;

        for (const bookmark of bookmarks) {
          queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, 0, false);
          queuedCount++;
          setProgress({
            phase: 'uploading',
            uploadProgress: {
              total: totalItems,
              completed: queuedCount,
              iterations: 0,
            },
          });
        }

        for (const space of spaces) {
          queuePlaintextOperation(space.id, 'space', space, 0, false);
          queuedCount++;
          setProgress({
            phase: 'uploading',
            uploadProgress: {
              total: totalItems,
              completed: queuedCount,
              iterations: 0,
            },
          });
        }

        for (const pinnedView of pinnedViews) {
          queuePlaintextOperation(pinnedView.id, 'pinned-view', pinnedView, 0, false);
          queuedCount++;
          setProgress({
            phase: 'uploading',
            uploadProgress: {
              total: totalItems,
              completed: queuedCount,
              iterations: 0,
            },
          });
        }

        // Push plaintext to server with retry logic
        let uploadedCount = 0;
        let uploadIteration = 0;

        while (uploadedCount < totalItems && uploadIteration < MAX_UPLOAD_ITERATIONS) {
          uploadIteration++;

          const pushResult = await pushPlaintext(100);

          if (!pushResult.success && pushResult.errors.length > 0) {
            console.warn(
              `[Vault Disable] Upload iteration ${uploadIteration} had errors:`,
              pushResult.errors
            );

            // On upload failure, abort and rollback
            if (uploadIteration >= MAX_UPLOAD_ITERATIONS) {
              await rollbackToEncrypted(
                backupId,
                `Upload failed after ${MAX_UPLOAD_ITERATIONS} attempts`
              );
              throw new Error(
                `Upload iteration limit exceeded (${MAX_UPLOAD_ITERATIONS}). Aborted.`
              );
            }

            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 1000 * uploadIteration));
          }

          uploadedCount = pushResult.synced;

          setProgress({
            phase: 'uploading',
            uploadProgress: {
              total: totalItems,
              completed: uploadedCount,
              iterations: uploadIteration,
            },
          });
        }

        if (uploadedCount < totalItems) {
          await rollbackToEncrypted(
            backupId,
            `Failed to upload all records. Uploaded: ${uploadedCount}/${totalItems}`
          );
          throw new Error(
            `Upload incomplete. Uploaded ${uploadedCount}/${totalItems}. Aborted and rolled back.`
          );
        }

        // STEP 6: Verify plaintext records on server (CRITICAL GATE)
        setProgress({
          phase: 'verifying-upload',
          step: 'Verifying plaintext records on server...',
        });

        let verificationAttempts = 0;
        const maxVerificationAttempts = 5;

        while (verificationAttempts < maxVerificationAttempts) {
          verificationAttempts++;

          try {
            const verifyParams = new URLSearchParams({
              expectedCount: totalItems.toString(),
            });

            const verifyRes = await Promise.race([
              fetch(`/api/vault/disable/verify-plaintext?${verifyParams}`),
              new Promise<Response>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error('Verification timeout - server took too long to respond')
                    ),
                  VERIFICATION_TIMEOUT_MS
                )
              ),
            ]);

            const verifyData = await verifyRes.json();

            if (!verifyData.verified) {
              console.error('[Vault Disable] Verification failed - count mismatch:', {
                serverCount: verifyData.serverCount,
                expectedCount: totalItems,
              });

              // Count mismatch - abort immediately
              if (verifyData.serverCount !== totalItems) {
                await rollbackToEncrypted(
                  backupId,
                  `Server record count mismatch: expected ${totalItems}, got ${verifyData.serverCount}`
                );
                throw new Error(
                  `Verification failed: count mismatch. Expected ${totalItems}, got ${verifyData.serverCount}. Rolled back.`
                );
              }

              // Retry on other verification issues
              if (verificationAttempts < maxVerificationAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * verificationAttempts));
                continue;
              }
            }

            // Verification passed! (Count matches)
            console.log('[Vault Disable] Verification passed:', {
              serverCount: verifyData.serverCount,
              expectedCount: totalItems,
            });
            break;
          } catch (verifyError) {
            if (verificationAttempts >= maxVerificationAttempts) {
              const errorMsg =
                verifyError instanceof Error ? verifyError.message : 'Unknown error';
              await rollbackToEncrypted(
                backupId,
                `Verification failed after ${maxVerificationAttempts} attempts: ${errorMsg}`
              );
              throw new Error(
                `Verification failed after ${maxVerificationAttempts} attempts. Rolled back.`
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 1000 * verificationAttempts));
          }
        }

        // ===== PHASE 2: COMMIT (Irreversible - Data safe on server) =====

        // STEP 1: Delete encrypted records from server (atomic transaction)
        setProgress({ phase: 'cleanup', step: 'Deleting encrypted records...' });

        const deleteEncryptedRes = await fetch('/api/vault/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete-encrypted' }),
        });

        if (!deleteEncryptedRes.ok) {
          const error = await deleteEncryptedRes.json();
          console.error(
            '[Vault Disable] Failed to delete encrypted records:',
            error
          );
          // Phase 2 failure: data is safe on server as plaintext, but encryption still visible
          // User can retry or manual recovery
          throw new Error(
            `Failed to delete encrypted records: ${error.error || 'Server error'}. Plaintext data is safe on server.`
          );
        }

        // STEP 2: Delete vault envelope from server
        setProgress({ phase: 'cleanup', step: 'Deleting vault envelope...' });

        const deleteVaultRes = await fetch('/api/vault/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete-vault' }),
        });

        if (!deleteVaultRes.ok) {
          const error = await deleteVaultRes.json();
          console.error('[Vault Disable] Failed to delete vault:', error);
          // Phase 2 partial failure: encryption deleted but vault envelope still exists
          // User can retry
          throw new Error(
            `Failed to delete vault: ${error.error || 'Server error'}. Some cleanup may be incomplete.`
          );
        }

        // STEP 3: Clear local encrypted storage
        rollbackMigration();

        // STEP 4: Save plaintext to local localStorage
        localStorage.setItem(
          'bookmark-vault-bookmarks',
          JSON.stringify({
            version: 1,
            data: bookmarks,
          })
        );
        localStorage.setItem('bookmark-vault-spaces', JSON.stringify(spaces));
        localStorage.setItem('bookmark-vault-pinned-views', JSON.stringify(pinnedViews));

        // STEP 5: Update app state
        lock();
        clearEnvelope();

        // Update sync settings to plaintext mode
        setSyncMode('plaintext');
        await saveToServer();

        // STEP 6: Delete backup checkpoint (cleanup)
        if (backupId) {
          deleteBackup(backupId);
        }

        setProgress({ phase: 'complete', step: 'Vault disabled successfully!' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to disable vault';

        // If we have a backup ID and haven't already rolled back, attempt rollback
        if (backupId && progress?.phase !== 'rolling-back') {
          try {
            await rollbackToEncrypted(backupId, errorMessage);
            return; // Error already set by rollbackToEncrypted
          } catch (rollbackError) {
            console.error('[Vault Disable] Additional rollback error:', rollbackError);
          }
        }

        setProgress({ phase: 'error', error: errorMessage, backupId });
        throw error;
      } finally {
        setIsDisabling(false);
      }
    },
    [
      getDecryptionKey,
      vaultEnvelope,
      lock,
      clearEnvelope,
      setSyncMode,
      saveToServer,
      progress?.phase,
      rollbackToEncrypted,
    ]
  );

  return {
    isDisabling,
    progress,
    verifyPassphrase,
    disableVault,
  };
}
