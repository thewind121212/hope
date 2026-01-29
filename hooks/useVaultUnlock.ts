"use client";

import { useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { unwrapVaultKeyFromEnvelope } from '@/lib/crypto';
import { loadAllEncryptedRecords, loadAndDecryptBookmark, clearPulledCiphertextRecords } from '@/lib/encrypted-storage';
import { decryptAndApplyPulledE2eRecords } from '@/lib/decrypt-and-apply';

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

    // Apply any server-pulled ciphertext that was cached while locked.
    try {
      await decryptAndApplyPulledE2eRecords(vaultKey);
    } catch {
      clearPulledCiphertextRecords();
    }

    setUnlocked(true, vaultKey);
  }, [vaultEnvelope, setUnlocked]);

  return { unlock };
}
