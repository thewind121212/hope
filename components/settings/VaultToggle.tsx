"use client";

import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Button from '@/components/ui/Button';
import { useVaultStore } from '@/stores/vault-store';
import { EnableVaultModal } from '@/components/vault/EnableVaultModal';
import { DisableVaultDialog } from '@/components/vault/DisableVaultDialog';

export function VaultToggle() {
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const { isSignedIn, isLoaded } = useAuth();
  const [serverEnabled, setServerEnabled] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const [loading, setLoading] = useState(true);

  const checkVaultStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/vault');
      const data = await response.json();
      setServerEnabled(data.enabled);
    } catch (err) {
      console.error('Failed to check vault status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      checkVaultStatus();
    }
  }, [isSignedIn, checkVaultStatus]);

  const handleToggle = async (enabled: boolean) => {
    if (!isSignedIn) {
      return;
    }

    if (enabled) {
      setShowEnableModal(true);
    } else {
      setShowDisableDialog(true);
    }
  };

  const handleEnableComplete = () => {
    setServerEnabled(true);
    setShowEnableModal(false);
  };

  const handleDisableConfirm = () => {
    setServerEnabled(false);
    setShowDisableDialog(false);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1">
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Unlock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Vault Mode Disabled
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Sign in to enable end-to-end encryption
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            disabled
            className="opacity-50"
          >
            Enable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2.5 rounded-xl ${serverEnabled ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
            {serverEnabled ? (
              <Shield className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            ) : (
              <Unlock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {serverEnabled ? 'Vault Mode Enabled' : 'Vault Mode Disabled'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {serverEnabled
                ? 'End-to-end encryption active'
                : 'Bookmarks stored locally only'}
            </p>
          </div>
        </div>

        <Button
          variant={serverEnabled ? 'secondary' : 'primary'}
          onClick={() => handleToggle(!serverEnabled)}
        >
          {serverEnabled ? 'Disable' : 'Enable'}
        </Button>
      </div>

      {vaultEnvelope && isUnlocked && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Lock className="w-4 h-4" />
            <span>Vault is unlocked</span>
          </div>
          <Button
            variant="ghost"
            onClick={lock}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Lock Now
          </Button>
        </div>
      )}

      <EnableVaultModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onComplete={handleEnableComplete}
      />

      <DisableVaultDialog
        isOpen={showDisableDialog}
        onClose={() => setShowDisableDialog(false)}
        onComplete={handleDisableConfirm}
      />
    </div>
  );
}
