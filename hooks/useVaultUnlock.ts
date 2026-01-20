"use client";

import { useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { unwrapVaultKeyFromEnvelope } from '@/lib/crypto';
import { loadAllEncryptedRecords, loadAndDecryptBookmark } from '@/lib/encrypted-storage';

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
        await loadAndDecryptBookmark(testRecord.recordId, vaultKey);
      }
    }

    setUnlocked(true, vaultKey);
  }, [vaultEnvelope, setUnlocked]);

  return { unlock };
}
