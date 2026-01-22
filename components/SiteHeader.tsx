"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Lock, Settings } from "lucide-react";
import { AuthHeader } from "@/components/auth";
import { useVaultStore } from "@/stores/vault-store";
import { useSyncSettingsStore } from "@/stores/sync-settings-store";

export function SiteHeader() {
  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const { syncMode } = useSyncSettingsStore();

  const showQuickLock = syncMode === 'e2e' && vaultEnvelope && isUnlocked;

  const handleQuickLock = () => {
    lock();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-zinc-200 dark:bg-slate-900/80 dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 2xl:max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-semibold tracking-tight">Bookmark Vault</h1>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {showQuickLock && (
              <button
                type="button"
                onClick={handleQuickLock}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Lock vault"
                aria-label="Lock vault"
              >
                <Lock className="w-5 h-5" />
              </button>
            )}
            {!isSettingsPage && (
              <Link 
                href="/settings" 
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <AuthHeader />
          </div>
        </div>
      </div>
    </header>
  );
}
