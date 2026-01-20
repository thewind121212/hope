"use client";

import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@/components/ui';
import { useVaultEnable, type VaultEnableProgress, type DataCounts } from '@/hooks/useVaultEnable';
import { Shield, Key, Cloud, CheckCircle2, AlertCircle, Loader2, BookmarkIcon, FolderIcon, EyeIcon } from 'lucide-react';

interface EnableVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function EnableVaultModal({ isOpen, onClose, onComplete }: EnableVaultModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [dataCounts, setDataCounts] = useState<DataCounts | null>(null);
  
  const { enableVault, isEnabling, progress, getDataCounts } = useVaultEnable();

  // Load data counts when modal opens
  useEffect(() => {
    if (isOpen) {
      setDataCounts(getDataCounts());
    }
  }, [isOpen, getDataCounts]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassphrase('');
      setConfirmPassphrase('');
      setAgreed(false);
      setError(null);
      setShowWarning(true);
      setPasswordStrength(null);
    }
  }, [isOpen]);

  const checkPasswordStrength = (pwd: string): PasswordStrength => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) {
      return { score, label: 'Weak', color: 'text-red-600 dark:text-red-400' };
    } else if (score <= 4) {
      return { score, label: 'Medium', color: 'text-amber-600 dark:text-amber-400' };
    } else {
      return { score, label: 'Strong', color: 'text-green-600 dark:text-green-400' };
    }
  };

  const handlePassphraseChange = (value: string) => {
    setPassphrase(value);
    setPasswordStrength(checkPasswordStrength(value));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (!agreed) {
      setError('Please acknowledge the warning');
      return;
    }

    try {
      await enableVault(passphrase);
      onComplete();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable vault. Please try again.';
      setError(errorMessage);
    }
  };

  // Show progress UI when enabling
  if (isEnabling && progress) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Enabling End-to-End Encryption">
        <div className="space-y-6 py-4">
          <ProgressPhase
            phase={progress.phase}
            encryptProgress={progress.encryptProgress}
            syncProgress={progress.syncProgress}
            error={progress.error}
            dataCounts={dataCounts}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enable End-to-End Encryption">
      <form onSubmit={handleSubmit} className="space-y-4">
        {showWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/30 dark:border-amber-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Your Passphrase Cannot Be Recovered
            </h3>
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>Your passphrase encrypts ALL your data</li>
              <li>If you forget it, your data is permanently lost</li>
              <li>Store it securely (password manager, safe deposit box)</li>
              <li>We cannot help you recover a lost passphrase</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="mt-3 text-sm text-amber-700 dark:text-amber-400 underline"
            >
              I understand, dismiss this warning
            </button>
          </div>
        )}

        {/* Data to be encrypted */}
        {dataCounts && dataCounts.total > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 dark:bg-slate-800/50 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" />
              Data to be encrypted & synced
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <DataCountItem
                icon={<BookmarkIcon className="w-4 h-4" />}
                count={dataCounts.bookmarks}
                label="Bookmarks"
              />
              <DataCountItem
                icon={<FolderIcon className="w-4 h-4" />}
                count={dataCounts.spaces}
                label="Spaces"
              />
              <DataCountItem
                icon={<EyeIcon className="w-4 h-4" />}
                count={dataCounts.pinnedViews}
                label="Pinned Views"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="passphrase" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Create Passphrase
          </label>
          <Input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => handlePassphraseChange(e.target.value)}
            placeholder="At least 8 characters, mix of upper/lower/numbers"
            className="w-full"
            autoFocus
            disabled={isEnabling}
          />
          {passwordStrength && passphrase.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Password strength:</span>
                <span className={`text-xs font-medium ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.score <= 2
                      ? 'w-1/3 bg-red-500'
                      : passwordStrength.score <= 4
                      ? 'w-2/3 bg-amber-500'
                      : 'w-full bg-green-500'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassphrase" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Confirm Passphrase
          </label>
          <Input
            id="confirmPassphrase"
            type="password"
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            placeholder="Re-enter passphrase"
            className="w-full"
            disabled={isEnabling}
          />
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
          />
          <span className="text-slate-700 dark:text-slate-300">
            I understand that my passphrase cannot be recovered and I am
            responsible for storing it safely
          </span>
        </label>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isEnabling}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 gap-2"
            disabled={!agreed || isEnabling}
          >
            <Shield className="w-4 h-4" />
            Enable & Sync
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Data count item component
function DataCountItem({ 
  icon, 
  count, 
  label 
}: { 
  icon: React.ReactNode; 
  count: number; 
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
      <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      <div className="text-sm">
        <span className="font-semibold">{count}</span>{' '}
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
      </div>
    </div>
  );
}

// Progress phase component
function ProgressPhase({
  phase,
  encryptProgress,
  syncProgress,
  error,
  dataCounts,
}: {
  phase: VaultEnableProgress['phase'];
  encryptProgress?: VaultEnableProgress['encryptProgress'];
  syncProgress?: number;
  error?: string;
  dataCounts: DataCounts | null;
}) {
  const phases = [
    { id: 'generating', label: 'Generating encryption keys', icon: Key },
    { id: 'encrypting', label: 'Encrypting your data', icon: Shield },
    { id: 'syncing', label: 'Syncing to cloud', icon: Cloud },
    { id: 'cleanup', label: 'Cleaning up', icon: CheckCircle2 },
  ];

  const currentIndex = phases.findIndex(p => p.id === phase);

  // Calculate overall progress
  let overallProgress = 0;
  if (phase === 'generating') overallProgress = 10;
  else if (phase === 'encrypting' && encryptProgress) {
    const encryptPct = encryptProgress.total > 0 
      ? (encryptProgress.completed / encryptProgress.total) * 100 
      : 0;
    overallProgress = 10 + (encryptPct * 0.5); // 10-60%
  } else if (phase === 'syncing') {
    overallProgress = 60 + ((syncProgress || 0) * 0.3); // 60-90%
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
                {isActive && p.id === 'encrypting' && encryptProgress && dataCounts && (
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    {encryptProgress.completed} / {encryptProgress.total} items
                    {encryptProgress.currentType && (
                      <span className="ml-1">
                        ({encryptProgress.currentType === 'bookmark' ? 'bookmarks' : 
                          encryptProgress.currentType === 'space' ? 'spaces' : 'pinned views'})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {phase === 'error' && error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Complete message */}
      {phase === 'complete' && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-lg text-sm text-center">
          Your data is now encrypted and synced securely!
        </div>
      )}

      <p className="text-xs text-center text-slate-500 dark:text-slate-400">
        Please don&apos;t close this window...
      </p>
    </div>
  );
}
