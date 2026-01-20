"use client";

import { useEffect, useState } from "react";
import { useAuth } from '@clerk/nextjs';
import { Cloud, CloudOff, RefreshCw, CheckCircle } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { getOutbox } from "@/lib/sync-outbox";

export function SyncStatus() {
  const { vaultEnvelope, isUnlocked } = useVaultStore();
  const { isLoaded, isSignedIn } = useAuth();
  const { isSyncing, pendingCount, syncFull } = useSyncEngine();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('last-sync-time');
    if (stored) {
      setLastSyncTime(new Date(stored));
    }
  }, []);

  const handleSyncNow = async () => {
    const result = await syncFull();
    if (result.push.success && result.pull.success) {
      setLastSyncTime(new Date());
      localStorage.setItem('last-sync-time', new Date().toISOString());
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <span>Loading sync status...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <CloudOff className="w-4 h-4" />
        <span>Sign in to enable sync</span>
      </div>
    );
  }

  if (!vaultEnvelope) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <CloudOff className="w-4 h-4" />
        <span>Enable vault mode to sync</span>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <CloudOff className="w-4 h-4" />
        <span>Vault locked</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-rose-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Sync Status
          </span>
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </>
          )}
        </button>
      </div>

      <div className="space-y-2">
        {lastSyncTime && !isSyncing && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <Cloud className="w-4 h-4" />
            <span>{pendingCount} pending change{pendingCount > 1 ? "s" : ""}</span>
          </div>
        )}

        {pendingCount === 0 && !isSyncing && lastSyncTime && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            All changes synced
          </div>
        )}
      </div>
    </div>
  );
}
