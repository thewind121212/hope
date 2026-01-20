"use client";

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
import type { Bookmark, Space, PinnedView } from '@/lib/types';

export interface VaultDisableProgress {
  phase: 'verifying' | 'decrypting' | 'uploading' | 'cleanup' | 'complete' | 'error';
  decryptProgress?: {
    total: number;
    completed: number;
  };
  uploadProgress?: number;
  error?: string;
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
  const getDecryptionKey = useCallback(async (passphrase: string): Promise<Uint8Array | null> => {
    if (!vaultEnvelope) return null;

    try {
      return await crypto.unwrapVaultKeyFromEnvelope(vaultEnvelope, passphrase);
    } catch {
      return null;
    }
  }, [vaultEnvelope]);

  const disableVault = useCallback(async (passphrase: string): Promise<void> => {
    setIsDisabling(true);
    setProgress({ phase: 'verifying' });

    try {
      // Phase 1: Verify passphrase and get decryption key
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

      // Phase 2: Decrypt all data
      setProgress({ phase: 'decrypting', decryptProgress: { total: 0, completed: 0 } });

      // Count total records
      const allRecords = loadAllEncryptedRecords();
      const total = allRecords.length;
      let completed = 0;

      setProgress({ phase: 'decrypting', decryptProgress: { total, completed } });

      // Decrypt bookmarks
      const bookmarks = await loadAndDecryptAllBookmarks(decryptKey);
      completed += bookmarks.length;
      setProgress({ phase: 'decrypting', decryptProgress: { total, completed } });

      // Decrypt spaces
      const spaces = await loadAndDecryptAllSpaces(decryptKey);
      completed += spaces.length;
      setProgress({ phase: 'decrypting', decryptProgress: { total, completed } });

      // Decrypt pinned views
      const pinnedViews = await loadAndDecryptAllPinnedViews(decryptKey);
      completed += pinnedViews.length;
      setProgress({ phase: 'decrypting', decryptProgress: { total, completed } });

      // Phase 3: Upload as plaintext
      setProgress({ phase: 'uploading', uploadProgress: 0 });

      // Clear any existing plaintext outbox
      clearPlaintextOutbox();

      // Queue all bookmarks as plaintext
      const totalItems = bookmarks.length + spaces.length + pinnedViews.length;
      let uploadedCount = 0;

      for (const bookmark of bookmarks) {
        queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, 0, false);
        uploadedCount++;
        setProgress({ 
          phase: 'uploading', 
          uploadProgress: Math.round((uploadedCount / totalItems) * 50) 
        });
      }

      for (const space of spaces) {
        queuePlaintextOperation(space.id, 'space', space, 0, false);
        uploadedCount++;
        setProgress({ 
          phase: 'uploading', 
          uploadProgress: Math.round((uploadedCount / totalItems) * 50) 
        });
      }

      for (const pinnedView of pinnedViews) {
        queuePlaintextOperation(pinnedView.id, 'pinned-view', pinnedView, 0, false);
        uploadedCount++;
        setProgress({ 
          phase: 'uploading', 
          uploadProgress: Math.round((uploadedCount / totalItems) * 50) 
        });
      }

      // Push plaintext to server
      const pushResult = await pushPlaintext(100);
      setProgress({ phase: 'uploading', uploadProgress: 75 });

      if (!pushResult.success && pushResult.errors.length > 0) {
        console.warn('Some plaintext records failed to upload:', pushResult.errors);
      }

      // Continue pushing if there are remaining items
      while (pushResult.synced < totalItems) {
        await pushPlaintext(100);
      }

      setProgress({ phase: 'uploading', uploadProgress: 100 });

      // Phase 4: Delete encrypted records from server
      setProgress({ phase: 'cleanup' });

      const deleteEncryptedRes = await fetch('/api/vault/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-encrypted' }),
      });

      if (!deleteEncryptedRes.ok) {
        console.warn('Failed to delete encrypted records from server');
      }

      // Delete vault from server
      const deleteVaultRes = await fetch('/api/vault/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-vault' }),
      });

      if (!deleteVaultRes.ok) {
        console.warn('Failed to delete vault from server');
      }

      // Phase 5: Clear local encrypted storage and update state
      rollbackMigration(); // Removes all encrypted localStorage

      // Save decrypted data to plaintext localStorage
      localStorage.setItem('bookmark-vault-bookmarks', JSON.stringify({
        version: 1,
        data: bookmarks,
      }));
      localStorage.setItem('bookmark-vault-spaces', JSON.stringify(spaces));
      localStorage.setItem('bookmark-vault-pinned-views', JSON.stringify(pinnedViews));

      // Clear vault state
      lock();
      clearEnvelope();

      // Update sync settings to plaintext mode
      setSyncMode('plaintext');
      await saveToServer();

      // Done!
      setProgress({ phase: 'complete' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable vault';
      setProgress({ phase: 'error', error: errorMessage });
      throw error;
    } finally {
      setIsDisabling(false);
    }
  }, [getDecryptionKey, lock, clearEnvelope, setSyncMode, saveToServer]);

  return {
    isDisabling,
    progress,
    verifyPassphrase,
    disableVault,
  };
}
