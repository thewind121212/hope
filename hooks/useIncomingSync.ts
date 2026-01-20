"use client";

import { useEffect } from "react";
import { useVaultStore } from "@/stores/vault-store";
import { loadAndDecryptAllBookmarks, saveEncryptedRecord } from "@/lib/encrypted-storage";
import type { StoredEncryptedRecord } from "@/lib/encrypted-storage";

export function useIncomingSync() {
  const { vaultEnvelope, isUnlocked, vaultKey } = useVaultStore();

  useEffect(() => {
    if (!isUnlocked || !vaultKey) return;

    const channel = new BroadcastChannel('vault-sync');

    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'RECORD_RECEIVED') {
        const { record } = event.data;

        const localRecords: StoredEncryptedRecord[] = JSON.parse(
          localStorage.getItem('bookmark-vault-encrypted') || '[]'
        );

        const existing = localRecords.find(r => r.recordId === record.recordId);

        if (!existing || existing.version < record.version) {
          const encryptedRecord: StoredEncryptedRecord = {
            recordId: record.recordId,
            recordType: record.recordType || 'bookmark', // Default to bookmark for backward compatibility
            ciphertext: record.ciphertext,
            iv: '', 
            tag: '', 
            version: record.version,
            deleted: record.deleted,
            createdAt: record.updatedAt,
            updatedAt: record.updatedAt,
          };

          saveEncryptedRecord(encryptedRecord);

          if (typeof window !== 'undefined') {
            const bookmarks = await loadAndDecryptAllBookmarks(vaultKey);
            window.dispatchEvent(new CustomEvent('bookmarks-updated', { detail: bookmarks }));
          }
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [isUnlocked, vaultKey]);
}
