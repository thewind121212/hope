"use client";

import { useState, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import * as crypto from '@/lib/crypto';
import { 
  migrateAllToEncrypted, 
  rollbackMigration,
  clearPlaintextStorage,
  type MigrationProgress,
  type StoredEncryptedRecord,
} from '@/lib/encrypted-storage';
import { getBookmarks } from '@/lib/storage';
import { getSpaces } from '@/lib/spacesStorage';
import { getPinnedViews } from '@/lib/pinnedViewsStorage';
import { syncPush } from '@/lib/sync-engine';
import { addToOutbox } from '@/lib/sync-outbox';
import type { Bookmark, Space, PinnedView } from '@/lib/types';

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

export function useVaultEnable() {
  const [isEnabling, setIsEnabling] = useState(false);
  const [progress, setProgress] = useState<VaultEnableProgress | null>(null);
  const { setEnvelope, setUnlocked } = useVaultStore();
  const { setSyncMode, saveToServer } = useSyncSettingsStore();

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

      // Update sync settings to E2E mode
      setSyncMode('e2e');
      await saveToServer();

      // Phase 4: Queue all encrypted records for sync
      setProgress({ phase: 'syncing', syncProgress: 0 });
      
      for (let i = 0; i < encryptedRecords.length; i++) {
        const record = encryptedRecords[i];
        addToOutbox({
          recordId: record.recordId,
          baseVersion: 0, // New record
          ciphertext: record.ciphertext,
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

      // Phase 5: Cleanup plaintext storage
      setProgress({ phase: 'cleanup' });
      clearPlaintextStorage();

      // Done!
      setProgress({ phase: 'complete' });
    } catch (error) {
      // Rollback on error
      rollbackMigration();
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable vault';
      setProgress({ phase: 'error', error: errorMessage });
      throw error;
    } finally {
      setIsEnabling(false);
    }
  }, [setEnvelope, setUnlocked, setSyncMode, saveToServer]);

  return { 
    enableVault, 
    isEnabling, 
    progress,
    getDataCounts,
  };
}
