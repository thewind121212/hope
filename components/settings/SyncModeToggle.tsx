"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  CloudOff, 
  Shield, 
  Lock, 
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useVaultStore } from '@/stores/vault-store';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import { useSyncEngine } from '@/hooks/useSyncEngineUnified';
import { EnableVaultModal } from '@/components/vault/EnableVaultModal';
import { DisableVaultDialog } from '@/components/vault/DisableVaultDialog';
import type { SyncMode } from '@/lib/types';

interface SyncModeOption {
  mode: SyncMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  requiresVault: boolean;
}

const syncModeOptions: SyncModeOption[] = [
  {
    mode: 'off',
    title: 'Local Only',
    description: 'Store bookmarks in your browser. No cloud backup.',
    icon: <CloudOff className="w-5 h-5" />,
    requiresAuth: false,
    requiresVault: false,
  },
  {
    mode: 'plaintext',
    title: 'Cloud Sync',
    description: 'Sync across devices. Fast and reliable.',
    icon: <Cloud className="w-5 h-5" />,
    requiresAuth: true,
    requiresVault: false,
  },
  {
    mode: 'e2e',
    title: 'End-to-End Encrypted',
    description: 'Zero-knowledge sync. Only you can read your data.',
    icon: <Shield className="w-5 h-5" />,
    requiresAuth: true,
    requiresVault: true,
  },
];

export function SyncModeToggle() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const { 
    syncMode, 
    syncEnabled, 
    setSyncMode, 
    loadFromServer, 
    saveToServer,
    isLoading: settingsLoading,
  } = useSyncSettingsStore();
  const {
    isSyncing,
    pendingCount,
    lastSync,
    error: syncError,
  } = useSyncEngine();

  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<SyncMode | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const [showMigrateDialog, setShowMigrateDialog] = useState(false);

  // Load settings from server on mount
  useEffect(() => {
    if (isSignedIn) {
      loadFromServer();
    }
  }, [isSignedIn, loadFromServer]);

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleModeSelect = useCallback(async (mode: SyncMode) => {
    // If already in this mode, do nothing
    if (mode === syncMode) {
      return;
    }

    // Switching to E2E mode always requires creating a new passphrase.
    // This ensures a fresh vault key and avoids issues with stale/corrupted envelopes.
    if (mode === 'e2e') {
      // Always show migrate dialog → EnableVaultModal for new passphrase
      setPendingMode('e2e');
      setShowMigrateDialog(true);
      return;
    }

    // If switching FROM E2E to another mode, show disable dialog (requires passphrase)
    if (syncMode === 'e2e') {
      setPendingMode(mode);
      setShowDisableDialog(true);
      return;
    }

    // Otherwise, just update the mode
    setSyncMode(mode);
    if (isSignedIn) {
      await saveToServer();
    }
  }, [syncMode, isSignedIn, setSyncMode, saveToServer]);

  const handleEnableComplete = useCallback(async () => {
    // Keep the modal open so the user can see progress + confirm completion.
    // Final mode switch happens on modal close ("Done").
  }, []);

  const handleMigrateToE2E = useCallback(async () => {
    // Overwrite strategy: wipe encrypted dataset first to avoid version conflicts,
    // then create a new vault (via EnableVaultModal) and push fresh ciphertext.
    setShowMigrateDialog(false);

    if (!isSignedIn) return;

    try {
      const res = await fetch('/api/vault/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-encrypted' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear encrypted cloud data');
      }

      // Clear any old local encrypted outbox before generating new ciphertext.
      // (The enable flow will enqueue fresh ops.)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vault-sync-outbox');
      }

      setShowEnableModal(true);
    } catch (error) {
      console.error('[sync-mode-toggle] migrate to e2e failed', error);
    }
  }, [isSignedIn]);

  const handleDisableConfirm = useCallback(async () => {
    setShowDisableDialog(false);
    if (pendingMode) {
      setSyncMode(pendingMode);
      setPendingMode(null);
      if (isSignedIn) {
        await saveToServer();
      }
    }
  }, [pendingMode, isSignedIn, setSyncMode, saveToServer]);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never synced';
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  // Loading state - but DON'T show skeleton if modal is open (prevents modal from unmounting)
  // When EnableVaultModal is open and enableVault() calls saveToServer(), settingsLoading becomes true.
  // If we show the skeleton, the entire SyncModeToggle component re-renders without the modal,
  // causing EnableVaultModal to unmount and lose its progress state.
  if ((!authLoaded || settingsLoading) && !showEnableModal && !showDisableDialog) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (

    <div className="space-y-6">
      {/* Sync Mode Selection */}
      <div className="space-y-3">
        {syncModeOptions.map((option) => {
          const isSelected = syncMode === option.mode;
          const isDisabled = (option.requiresAuth && !isSignedIn);
          
          return (
            <button
              type="button"
              key={option.mode}
              onClick={() => !isDisabled && handleModeSelect(option.mode)}
              disabled={isDisabled}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all
                ${isSelected 
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2.5 rounded-xl
                  ${isSelected 
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }
                `}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${isSelected ? 'text-rose-900 dark:text-rose-100' : 'text-slate-900 dark:text-slate-100'}`}>
                      {option.title}
                    </h3>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-rose-500" />
                    )}
                    {option.requiresAuth && !isSignedIn && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        Sign in required
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 ${isSelected ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vault Status (when E2E mode) */}
      {syncMode === 'e2e' && vaultEnvelope && (
        <div className={`
          flex items-center justify-between p-4 rounded-xl border
          ${isUnlocked 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' 
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
          }
        `}>
          <div className="flex items-center gap-3">
            {isUnlocked ? (
              <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <p className={`font-medium ${isUnlocked ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
                {isUnlocked ? 'Vault Unlocked' : 'Vault Locked'}
              </p>
              <p className={`text-sm ${isUnlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {isUnlocked ? 'Ready to sync encrypted data' : 'Enter passphrase to sync'}
              </p>
            </div>
          </div>
          {isUnlocked && (
            <Button
              variant="ghost"
              onClick={lock}
              className="text-emerald-700 dark:text-emerald-300"
            >
              Lock
            </Button>
          )}
        </div>
      )}

      {/* Sync Status (when sync enabled) */}
      {syncEnabled && syncMode !== 'off' && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isOnline ? (
                <WifiOff className="w-5 h-5 text-amber-500" />
              ) : isSyncing ? (
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              ) : syncError ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : pendingCount > 0 ? (
                <Cloud className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {!isOnline 
                    ? 'Offline' 
                    : isSyncing 
                      ? 'Syncing...' 
                      : syncError 
                        ? 'Sync Error'
                        : pendingCount > 0 
                          ? `${pendingCount} pending changes`
                          : 'All synced'
                  }
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {syncError || (!isOnline ? 'Changes will sync when online' : formatLastSync(lastSync))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Migrate confirm */}
      <ConfirmDialog
        isOpen={showMigrateDialog}
        title="Migrate Cloud Sync to End-to-End Encryption?"
        description="This will overwrite any existing encrypted cloud data. Your plaintext cloud data will remain unchanged."
        confirmLabel="Migrate & Overwrite Vault"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleMigrateToE2E}
        onClose={() => {
          setShowMigrateDialog(false);
          setPendingMode(null);
        }}
      />

      {/* Modals */}
      <EnableVaultModal
        isOpen={showEnableModal}
        onClose={() => {
          setShowEnableModal(false);
          setPendingMode(null);
          // NOTE: Sync mode is now set to 'e2e' in useVaultEnable.ts after enable succeeds,
          // so we don't need to do it here anymore.
        }}
        onComplete={handleEnableComplete}
      />

      <DisableVaultDialog
        isOpen={showDisableDialog}
        onClose={() => {
          setShowDisableDialog(false);
          setPendingMode(null);
        }}
        onComplete={handleDisableConfirm}
      />
    </div>
  );
}
