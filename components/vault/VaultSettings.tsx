"use client";

import { useState } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { EnableVaultModal } from './EnableVaultModal';
import { VaultStatusIndicator } from './VaultStatusIndicator';
import { VaultToggle } from '@/components/settings/VaultToggle';

export function VaultSettings() {
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const [showEnableModal, setShowEnableModal] = useState(false);

  const handleEnableComplete = () => {};

  if (vaultEnvelope) {
    return (
      <div className="space-y-4">
        <VaultToggle />
        <div className="mt-4">
          <VaultStatusIndicator />
        </div>
      </div>
    );
  }

  return (
    <div>
      <VaultToggle />
    </div>
  );
}
