'use client';

import { useState, useCallback, useEffect } from 'react';
import { syncPush, syncPull, syncFull, queueOperation, getPendingCount, type SyncResult, type PullResult } from '@/lib/sync-engine';
import { toast } from 'sonner';

interface UseSyncEngineReturn {
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
  syncPush: () => Promise<SyncResult>;
  syncPull: () => Promise<PullResult>;
  syncFull: () => Promise<{ push: SyncResult; pull: PullResult }>;
  queueOperation: (operation: { recordId: string; baseVersion: number; ciphertext: string; deleted: boolean }) => void;
}

export function useSyncEngine(): UseSyncEngineReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPendingCount());
  }, []);

  useEffect(() => {
    refreshPendingCount();

    const channel = new BroadcastChannel('sync-events');
    channel.onmessage = (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        setLastSync(new Date());
        refreshPendingCount();
      }
    };

    return () => channel.close();
  }, [refreshPendingCount]);

  const handleSync = useCallback(async (fn: () => Promise<any>) => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await fn();
      setLastSync(new Date());
      refreshPendingCount();

      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('sync-events');
        channel.postMessage({ type: 'SYNC_COMPLETE' });
        channel.close();
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      toast.error('Sync failed', { description: message });
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  return {
    isSyncing,
    pendingCount,
    lastSync,
    error,
    syncPush: useCallback(() => handleSync(() => syncPush()), [handleSync]),
    syncPull: useCallback(() => handleSync(() => syncPull()), [handleSync]),
    syncFull: useCallback(() => handleSync(() => syncFull()), [handleSync]),
    queueOperation: useCallback((op: { recordId: string; baseVersion: number; ciphertext: string; deleted: boolean }) => {
      queueOperation(op);
      refreshPendingCount();
    }, [refreshPendingCount]),
  };
}
