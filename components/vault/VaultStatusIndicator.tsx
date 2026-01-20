"use client";

import { Shield, Lock, XCircle } from 'lucide-react';
import { useVaultStore } from '@/stores/vault-store';

export function VaultStatusIndicator() {
  const { vaultEnvelope, isUnlocked } = useVaultStore();

  if (!vaultEnvelope) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <XCircle className="w-4 h-4" />
        <span>Vault Disabled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {isUnlocked ? (
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-900/50">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">Vault Unlocked</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/50">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-medium">Vault Locked</span>
          </div>
        </>
      )}
    </div>
  );
}
