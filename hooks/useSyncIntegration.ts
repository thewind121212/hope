"use client";

import { useCallback } from "react";
import { useVaultStore } from "@/stores/vault-store";
import { queueOperation } from "@/lib/sync-engine";
import { loadAllEncryptedRecords } from "@/lib/encrypted-storage";
import type { Bookmark } from "@/lib/types";

export function useSyncIntegration() {
  const { vaultEnvelope, isUnlocked, vaultKey } = useVaultStore();

  const queueSyncOperation = useCallback((
    recordId: string,
    baseVersion: number,
    ciphertext: string,
    deleted: boolean
  ) => {
    if (!vaultEnvelope || !isUnlocked) return;

    queueOperation({
      recordId,
      baseVersion,
      ciphertext,
      deleted,
    });
  }, [vaultEnvelope, isUnlocked]);

  const getCurrentVersion = useCallback((recordId: string): number => {
    if (!vaultEnvelope) return 0;

    try {
      const records = loadAllEncryptedRecords();
      const record = records.find(r => r.recordId === recordId);
      return record?.version ?? 0;
    } catch {
      return 0;
    }
  }, [vaultEnvelope]);

  return {
    canSync: !!(vaultEnvelope && isUnlocked),
    queueSyncOperation,
    getCurrentVersion,
  };
}
