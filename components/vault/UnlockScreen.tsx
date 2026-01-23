"use client";

import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useVaultUnlock } from '@/hooks/useVaultUnlock';
import { RecoveryCodeUnlock } from './RecoveryCodeUnlock';

export function UnlockScreen() {
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const { unlock } = useVaultUnlock();
  const { signOut } = useClerk();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnlocking(true);

    try {
      await unlock(passphrase);
    } catch {
      setError('Incorrect passphrase. Please try again.');
      setPassphrase('');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear all localStorage data first (prevents any sync triggers)
      localStorage.clear();
      // Clear sessionStorage
      sessionStorage.clear();
    } finally {
      try {
        // Sign out via Clerk
        await signOut();
      } finally {
        // Hard refresh to clear all in-memory state
        window.location.replace('/');
      }
    }
  };

  if (useRecoveryCode) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800">
          <RecoveryCodeUnlock
            onCancel={() => setUseRecoveryCode(false)}
            onSuccess={() => {
              // Unlock successful - the component handles the rest
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md w-full border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/25">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Unlock Your Vault
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your passphrase to access your bookmarks
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className="w-full px-4 py-3.5 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-transparent transition-all"
              disabled={isUnlocking}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              disabled={isUnlocking}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-3.5 text-base font-medium bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={!passphrase || isUnlocking}
          >
            {isUnlocking ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Unlocking...
              </>
            ) : (
              'Unlock Vault'
            )}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setUseRecoveryCode(true)}
            className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Forgot passphrase? Use recovery code
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out and clear local data
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            Your passphrase is never stored or transmitted.
            <br />
            All encryption happens locally in your browser.
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
        title="Sign out and clear all data?"
        description="This will permanently delete all your local bookmarks and settings. If you have cloud sync enabled, your data will remain on the server, but you will need to sign in again and enter your passphrase to access it."
        confirmLabel="Sign out & Clear Data"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
