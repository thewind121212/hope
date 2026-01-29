"use client";

import { useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import {
  hashRecoveryCode,
  unwrapVaultKeyWithRecoveryCode,
  deriveKeyFromPassphrase,
  wrapVaultKey,
  arrayToBase64,
  base64ToArray,
} from '@/lib/crypto';
import { loadAllEncryptedRecords, loadAndDecryptBookmark, clearPulledCiphertextRecords } from '@/lib/encrypted-storage';
import { decryptAndApplyPulledE2eRecords } from '@/lib/decrypt-and-apply';
import type { VaultKeyEnvelope } from '@/lib/types';

export function useRecoveryCodeUnlock() {
  const { setUnlocked, vaultEnvelope, updateEnvelope } = useVaultStore();

  const unlockWithRecoveryCode = useCallback(
    async (recoveryCode: string, newPassphrase: string): Promise<void> => {
      if (!vaultEnvelope) {
        throw new Error('No vault envelope found');
      }

      if (!vaultEnvelope.recoveryWrappers || vaultEnvelope.recoveryWrappers.length === 0) {
        throw new Error('No recovery codes available');
      }

      // Hash the recovery code to find matching wrapper
      const codeHash = await hashRecoveryCode(recoveryCode);
      const matchingWrapper = vaultEnvelope.recoveryWrappers.find(w => w.codeHash === codeHash);

      if (!matchingWrapper) {
        throw new Error('Invalid recovery code');
      }

      if (matchingWrapper.usedAt !== null) {
        throw new Error('This recovery code has already been used');
      }

      // Unwrap vault key with recovery code
      const vaultKey = await unwrapVaultKeyWithRecoveryCode(
        matchingWrapper.wrappedKey,
        matchingWrapper.salt,
        recoveryCode
      );

      // Derive new wrapping key from new passphrase
      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      const newWrappingKey = await deriveKeyFromPassphrase(newPassphrase, newSalt);
      const newWrappedKey = await wrapVaultKey(vaultKey, newWrappingKey);

      // Update envelope: new passphrase wrapper + mark recovery code as used
      const updatedEnvelope: VaultKeyEnvelope = {
        ...vaultEnvelope,
        wrappedKey: arrayToBase64(newWrappedKey),
        salt: arrayToBase64(newSalt),
        recoveryWrappers: vaultEnvelope.recoveryWrappers.map(w =>
          w.id === matchingWrapper.id
            ? { ...w, usedAt: new Date().toISOString() }
            : w
        ),
      };

      // Save updated envelope to server
      const response = await fetch('/api/vault/envelope', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEnvelope),
      });

      if (!response.ok) {
        throw new Error('Failed to update vault envelope on server');
      }

      // Update local vault store
      updateEnvelope(updatedEnvelope);

      // Verify vault key by decrypting a test record
      const encryptedRecords = loadAllEncryptedRecords();
      if (encryptedRecords.length > 0) {
        const testRecord = encryptedRecords[0];
        if (!testRecord.deleted) {
          try {
            await loadAndDecryptBookmark(testRecord.recordId, vaultKey);
          } catch {
            // Ignore corrupted local ciphertext; recovery unlock still valid.
          }
        }
      }

      // Apply any server-pulled ciphertext
      try {
        await decryptAndApplyPulledE2eRecords(vaultKey);
      } catch {
        clearPulledCiphertextRecords();
      }

      // Unlock vault
      setUnlocked(true, vaultKey);
    },
    [vaultEnvelope, setUnlocked, updateEnvelope]
  );

  return { unlockWithRecoveryCode };
}
