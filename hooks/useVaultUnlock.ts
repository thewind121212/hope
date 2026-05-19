"use client";

import { useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { unwrapVaultKeyFromEnvelope } from '@/lib/crypto';
import {
  loadAllEncryptedRecords,
  loadAndDecryptBookmark,
  loadAndDecryptAllBookmarks,
  loadAndDecryptAllSpaces,
  loadAndDecryptAllPinnedViews,
  mergePulledCiphertextRecords,
  clearPulledCiphertextRecords,
} from '@/lib/encrypted-storage';
import { decryptAndApplyPulledE2eRecords } from '@/lib/decrypt-and-apply';
import { syncPull } from '@/lib/sync-engine';
import { setBookmarks, invalidateAllCaches } from '@/lib/storage';
import { setSpaces } from '@/lib/spacesStorage';
import { savePinnedViews } from '@/lib/pinnedViewsStorage';

export function useVaultUnlock() {
  const { setUnlocked, vaultEnvelope } = useVaultStore();

  const unlock = useCallback(async (passphrase: string): Promise<void> => {
    if (!vaultEnvelope) {
      throw new Error('No vault envelope found');
    }

    const vaultKey = await unwrapVaultKeyFromEnvelope(vaultEnvelope, passphrase);

    const encryptedRecords = loadAllEncryptedRecords();
    if (encryptedRecords.length > 0) {
      const testRecord = encryptedRecords[0];
      if (!testRecord.deleted) {
        try {
          await loadAndDecryptBookmark(testRecord.recordId, vaultKey);
        } catch {
          // Ignore corrupted local ciphertext; passphrase is still valid.
        }
      }
    }

    // Pull latest encrypted records from server every unlock so the local
    // encrypted store is up to date before we decrypt for the UI.
    try {
      const pulled = await syncPull();
      if (pulled.success && pulled.records.length > 0) {
        mergePulledCiphertextRecords(pulled.records);
      }
    } catch (err) {
      console.warn('[vault-unlock] server pull failed', err);
    }

    // Apply any server-pulled ciphertext that was cached while locked.
    try {
      await decryptAndApplyPulledE2eRecords(vaultKey);
    } catch {
      clearPulledCiphertextRecords();
    }

    // Rehydrate plaintext working copy from encrypted local store so UI
    // (which reads getBookmarks()/getSpaces()/getPinnedViews()) is populated.
    // Encrypted records remain the canonical at-rest form.
    try {
      const [bookmarks, spaces, pinnedViews] = await Promise.all([
        loadAndDecryptAllBookmarks(vaultKey),
        loadAndDecryptAllSpaces(vaultKey),
        loadAndDecryptAllPinnedViews(vaultKey),
      ]);
      setBookmarks(bookmarks);
      setSpaces(spaces);
      savePinnedViews(pinnedViews);
      invalidateAllCaches();
    } catch (err) {
      console.warn('[vault-unlock] hydrate plaintext failed', err);
    }

    setUnlocked(true, vaultKey);
  }, [vaultEnvelope, setUnlocked]);

  return { unlock };
}
