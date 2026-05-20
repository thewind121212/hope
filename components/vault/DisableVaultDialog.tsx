"use client";

import { useState, useEffect } from 'react';
import { useAuth } from "@clerk/nextjs";
import { Modal, Input, Button } from '@/components/ui';
import { useVaultDisable, type VaultDisableProgress } from '@/hooks/useVaultDisable';
import { clearAllVaultData } from '@/lib/auth-cleanup';
import { useResetBookmarksStateSafe } from '@/hooks/useBookmarks';
import { useUiStore } from '@/stores/useUiStore';
import { toast } from 'sonner';
import {
  Shield,
  Key,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
} from 'lucide-react';

interface DisableVaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  /** Sync mode to switch to after the vault is disabled. Defaults to 'plaintext'. */
  targetMode?: 'plaintext' | 'off';
}

export function DisableVaultDialog({ isOpen, onClose, onComplete, targetMode = 'plaintext' }: DisableVaultDialogProps) {
  const [passphrase, setPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { disableVault, isDisabling, progress } = useVaultDisable();
  const { signOut } = useAuth();
  const resetBookmarks = useResetBookmarksStateSafe();
  const resetUiState = useUiStore((state) => state.resetAllState);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassphrase('');
      setPassphraseError(null);
      setConfirmed(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassphraseError(null);

    if (!confirmed) {
      setPassphraseError('Please confirm you understand the consequences');
      return;
    }

    if (!passphrase) {
      setPassphraseError('Please enter your passphrase');
      return;
    }

    try {
      await disableVault(passphrase, targetMode);
      onComplete();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable vault';
      setPassphraseError(errorMessage);
    }
  };

  // Show progress UI when disabling
  if (isDisabling && progress) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Switching to Plaintext Mode">
        <div className="space-y-6 py-4">
          <ProgressPhase
            phase={progress.phase}
            decryptProgress={progress.decryptProgress}
            uploadProgress={progress.uploadProgress}
            error={progress.error}
          />
        </div>
      </Modal>
    );
  }

  // Show completion message
  if (progress?.phase === 'complete') {
    const handleDone = async () => {
      onClose();
      onComplete();

      // 1. Clear storage and caches
      clearAllVaultData();

      // 2. Reset React state (triggers immediate re-render to empty UI)
      resetBookmarks?.();
      resetUiState();

      // 3. Show toast to user
      toast.success('Vault cleared. Signing out...');

      // 4. Give React time to re-render before redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Then sign out and redirect
      await signOut({ redirectUrl: '/sign-in' });
    };

    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Switched to Plaintext">
        <div className="space-y-4 py-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
              Successfully Switched to Plaintext
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Your data has been decrypted and is now syncing as plaintext.
            </p>
          </div>
          <Button onClick={handleDone} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch to Plaintext Mode">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                This will disable end-to-end encryption
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                Your data will be decrypted and re-uploaded as plaintext. 
                The encrypted vault will be deleted from the server.
              </p>
            </div>
          </div>
        </div>

        {/* What will happen */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 dark:bg-slate-800/50 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Download className="w-4 h-4" />
            What will happen:
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
            <li>Your passphrase will be verified</li>
            <li>All encrypted data will be decrypted locally</li>
            <li>Data will be re-uploaded as plaintext to the server</li>
            <li>Your encrypted vault will be permanently deleted</li>
          </ul>
        </div>

        {/* Passphrase input */}
        <div className="space-y-2">
          <Input
            type="password"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
              setPassphraseError(null);
            }}
            label="Enter your vault passphrase"
            placeholder="Enter your passphrase to decrypt"
            error={passphraseError || undefined}
            helperText="Your passphrase is required to decrypt your data before switching to plaintext."
            autoFocus
          />
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
          />
          <span className="text-slate-700 dark:text-slate-300">
            I understand that my encrypted cloud data will be deleted and replaced with plaintext
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDisabling}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 gap-2"
            disabled={!confirmed || isDisabling || !passphrase}
          >
            <Trash2 className="w-4 h-4" />
            Decrypt & Switch to Plaintext
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Progress phase component for disable flow
function ProgressPhase({
  phase,
  decryptProgress,
  uploadProgress,
  error,
}: {
  phase: VaultDisableProgress['phase'];
  decryptProgress?: VaultDisableProgress['decryptProgress'];
  uploadProgress?: VaultDisableProgress['uploadProgress'];
  error?: string;
}) {
  const phases = [
    { id: 'verifying', label: 'Verifying passphrase', icon: Key },
    { id: 'decrypting', label: 'Decrypting your data', icon: Shield },
    { id: 'uploading', label: 'Uploading as plaintext', icon: Cloud },
    { id: 'cleanup', label: 'Cleaning up', icon: Trash2 },
  ];

  const currentIndex = phases.findIndex(p => p.id === phase);

  // Calculate overall progress
  let overallProgress = 0;
  if (phase === 'verifying') overallProgress = 10;
  else if (phase === 'decrypting' && decryptProgress) {
    const decryptPct = decryptProgress.total > 0 
      ? (decryptProgress.completed / decryptProgress.total) * 100 
      : 0;
    overallProgress = 10 + (decryptPct * 0.4); // 10-50%
  } else if (phase === 'uploading' && uploadProgress) {
    const uploadPct = uploadProgress.total > 0
      ? (uploadProgress.completed / uploadProgress.total) * 100
      : 0;
    overallProgress = 50 + (uploadPct * 0.4); // 50-90%
  } else if (phase === 'uploading') {
    overallProgress = 50;
  } else if (phase === 'cleanup') overallProgress = 95;
  else if (phase === 'complete') overallProgress = 100;
  else if (phase === 'error') overallProgress = 0;

  return (
    <div className="space-y-6">
      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600 dark:text-slate-400">Progress</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Phase list */}
      <div className="space-y-3">
        {phases.map((p, index) => {
          const Icon = p.icon;
          const isActive = p.id === phase;
          const isComplete = index < currentIndex || phase === 'complete';
          const isError = phase === 'error' && isActive;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800'
                  : isComplete
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${isActive 
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' 
                  : isComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }
              `}>
                {isActive && !isError ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  isActive 
                    ? 'text-rose-900 dark:text-rose-100' 
                    : isComplete
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {p.label}
                </p>
                {isActive && p.id === 'decrypting' && decryptProgress && (
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    {decryptProgress.completed} / {decryptProgress.total} items
                  </p>
                )}
                {isActive && p.id === 'uploading' && uploadProgress !== undefined && (
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    {uploadProgress.completed} / {uploadProgress.total} items
                    {uploadProgress.iterations > 0 && ` (attempt ${uploadProgress.iterations})`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {phase === 'error' && error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-xs text-center text-slate-500 dark:text-slate-400">
        Please don&apos;t close this window...
      </p>
    </div>
  );
}
