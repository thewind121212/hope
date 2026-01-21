'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import { useVaultStore } from '@/stores/vault-store';
import { useDataRefreshStore } from '@/stores/data-refresh-store';
import type {
  Bookmark,
  Space,
  PinnedView,
  RecordType,
  SyncPushResult,
  PlaintextRecord,
} from '@/lib/types';

// Import sync engines
import {
  syncPush as encryptedPush,
  syncPull as encryptedPull,
  queueOperation as queueEncryptedOperation,
  getPendingCount as getEncryptedPendingCount,
} from '@/lib/sync-engine';
import {
  pushPlaintext,
  pullAllPlaintext,
  queuePlaintextOperation,
  getPendingCount as getPlaintextPendingCount,
  clearOutbox as clearPlaintextOutbox,
} from '@/lib/plaintext-sync-engine';
import { getBookmarks, setBookmarks, getStoredChecksumMeta, saveChecksumMeta, type ChecksumMeta } from '@/lib/storage';
import { getSpaces, setSpaces } from '@/lib/spacesStorage';
import { getPinnedViews, savePinnedViews } from '@/lib/pinnedViewsStorage';

// Helper to update local _syncVersion and updatedAt after successful push
function updateLocalSyncVersions(results: { recordId: string; version: number; updatedAt: string }[]): void {
  if (!results || results.length === 0) return;

  const versionMap = new Map(results.map(r => [r.recordId, r.version]));
  const updatedAtMap = new Map(results.map(r => [r.recordId, r.updatedAt]));

  // Update bookmarks
  const bookmarks = getBookmarks();
  let bookmarksUpdated = false;
  for (const bookmark of bookmarks) {
    const newVersion = versionMap.get(bookmark.id);
    if (newVersion !== undefined) {
      bookmark._syncVersion = newVersion;
      bookmark.updatedAt = updatedAtMap.get(bookmark.id)!;
      bookmarksUpdated = true;
    }
  }
  if (bookmarksUpdated) setBookmarks(bookmarks);

  // Update spaces
  const spaces = getSpaces();
  let spacesUpdated = false;
  for (const space of spaces) {
    const newVersion = versionMap.get(space.id);
    if (newVersion !== undefined) {
      space._syncVersion = newVersion;
      space.updatedAt = updatedAtMap.get(space.id)!;
      spacesUpdated = true;
    }
  }
  if (spacesUpdated) setSpaces(spaces);

  // Update pinned views
  const views = getPinnedViews();
  let viewsUpdated = false;
  for (const view of views) {
    const newVersion = versionMap.get(view.id);
    if (newVersion !== undefined) {
      view._syncVersion = newVersion;
      view.updatedAt = updatedAtMap.get(view.id)!;
      viewsUpdated = true;
    }
  }
  if (viewsUpdated) savePinnedViews(views);
}

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
}

interface UseSyncEngineReturn extends SyncState {
  syncPush: () => Promise<SyncPushResult>;
  syncPull: () => Promise<PlaintextRecord[]>;
  syncFull: () => Promise<{ pushed: number; pulled: number }>;
  checkAndSync: () => Promise<{ pulled: number; skipped: boolean }>;

  queueBookmark: (bookmark: Bookmark, version: number, deleted?: boolean) => void;
  queueSpace: (space: Space, version: number, deleted?: boolean) => void;
  queuePinnedView: (view: PinnedView, version: number, deleted?: boolean) => void;

  clearPending: () => void;
  refreshPendingCount: () => void;
  canSync: boolean;
}

export function useSyncEngine(): UseSyncEngineReturn {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  const { syncMode, syncEnabled, setLastSyncAt } = useSyncSettingsStore();
  const { isUnlocked, vaultEnvelope, vaultKey } = useVaultStore();
  const { triggerRefresh } = useDataRefreshStore();

  const syncInProgressRef = useRef(false);

  const canSync = useCallback(() => {
    if (!syncEnabled || syncMode === 'off') return false;
    if (syncMode === 'e2e') {
      return isUnlocked && vaultEnvelope !== null && vaultKey !== null;
    }
    return true;
  }, [syncMode, syncEnabled, isUnlocked, vaultEnvelope, vaultKey]);

  const refreshPendingCount = useCallback(() => {
    // Only access storage on client side
    if (typeof window === 'undefined') return;

    if (syncMode === 'e2e') {
      setState(prev => ({ ...prev, pendingCount: getEncryptedPendingCount() }));
    } else if (syncMode === 'plaintext') {
      setState(prev => ({ ...prev, pendingCount: getPlaintextPendingCount() }));
    } else {
      setState(prev => ({ ...prev, pendingCount: 0 }));
    }
  }, [syncMode]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    refreshPendingCount();

    // BroadcastChannel might not be available in all contexts
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('sync-events');
      channel.onmessage = (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          setState(prev => ({ ...prev, lastSync: new Date() }));
          refreshPendingCount();
        }
      };
    } catch {
      // BroadcastChannel not available, ignore
    }

    const stored = localStorage.getItem('last-sync-time');
    if (stored) {
      setState(prev => ({ ...prev, lastSync: new Date(stored) }));
    }

    return () => {
      try {
        channel?.close();
      } catch {
        // Ignore
      }
    };
  }, [refreshPendingCount]);

  // === PULL ===
  const syncPull = useCallback(async (): Promise<PlaintextRecord[]> => {
    if (!canSync()) return [];
    if (syncInProgressRef.current) return [];

    syncInProgressRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      let records: PlaintextRecord[] = [];

      if (syncMode === 'e2e') {
        await encryptedPull(() => {});
      } else {
        const result = await pullAllPlaintext();
        if (result.error) throw new Error(result.error);
        records = result.records;
      }

      const now = new Date();
      setState(prev => ({ ...prev, lastSync: now }));
      setLastSyncAt(now.toISOString());
      localStorage.setItem('last-sync-time', now.toISOString());

      return records;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pull failed';
      setState(prev => ({ ...prev, error: message }));
      toast.error('Sync failed', { description: message });
      return [];
    } finally {
      syncInProgressRef.current = false;
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [canSync, syncMode, setLastSyncAt]);

  // === PUSH ===
  const syncPush = useCallback(async (): Promise<SyncPushResult> => {
    if (!canSync()) {
      return { success: false, synced: 0, conflicts: [], errors: ['Sync not available'] };
    }

    if (syncInProgressRef.current) {
      return { success: false, synced: 0, conflicts: [], errors: ['Sync already in progress'] };
    }

    syncInProgressRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      let result: SyncPushResult;

      if (syncMode === 'e2e') {
        const encResult = await encryptedPush();
        result = {
          success: encResult.success,
          synced: encResult.pushed,
          conflicts: encResult.conflicts.map(c => ({
            recordId: c.recordId,
            recordType: 'bookmark' as RecordType,
            localVersion: 0,
            serverVersion: c.currentVersion,
          })),
          errors: encResult.error ? [encResult.error] : [],
        };
      } else {
        result = await pushPlaintext();
      }

      if (result.success && result.synced > 0 && result.results) {
        updateLocalSyncVersions(result.results);
        toast.success('Synced to cloud');
      }

      const now = new Date();
      setState(prev => ({ ...prev, lastSync: now }));
      setLastSyncAt(now.toISOString());
      localStorage.setItem('last-sync-time', now.toISOString());

      // Notify other tabs (if BroadcastChannel is available)
      try {
        const channel = new BroadcastChannel('sync-events');
        channel.postMessage({ type: 'SYNC_COMPLETE' });
        channel.close();
      } catch {
        // BroadcastChannel not available, ignore
      }

      refreshPendingCount();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push failed';
      setState(prev => ({ ...prev, error: message }));
      toast.error('Sync failed', { description: message });
      return { success: false, synced: 0, conflicts: [], errors: [message] };
    } finally {
      syncInProgressRef.current = false;
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [canSync, syncMode, setLastSyncAt, refreshPendingCount]);

  // === APPLY PULLED RECORDS ===
  const applyPulledRecords = useCallback((records: PlaintextRecord[]) => {
    const bookmarks: Bookmark[] = [];
    const spaces: Space[] = [];
    const pinnedViews: PinnedView[] = [];

    for (const record of records) {
      if (record.deleted) continue;

      const r = record as PlaintextRecord;
      switch (r.recordType) {
        case 'bookmark':
          bookmarks.push({
            ...(r.data as Bookmark),
            _syncVersion: r.version,
            updatedAt: r.updatedAt,
          });
          break;
        case 'space':
          spaces.push({
            ...(r.data as Space),
            _syncVersion: r.version,
            updatedAt: r.updatedAt,
          });
          break;
        case 'pinned-view':
          pinnedViews.push({
            ...(r.data as PinnedView),
            _syncVersion: r.version,
            updatedAt: r.updatedAt,
          });
          break;
      }
    }

    // Always save to localStorage (even if empty - this means server is empty)
    setBookmarks(bookmarks);
    setSpaces(spaces);
    savePinnedViews(pinnedViews);

    // Trigger UI refresh so components re-render
    triggerRefresh();
  }, [triggerRefresh]);

  // === SIMPLIFIED CHECK AND SYNC ===
  const checkAndSync = useCallback(async (): Promise<{ pulled: number; skipped: boolean }> => {
    if (!canSync() || syncInProgressRef.current) {
      return { pulled: 0, skipped: true };
    }

    try {
      // Fetch server checksum
      const response = await fetch('/api/sync/plaintext/checksum', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        // Checksum failed - fall back to pull
        const records = await syncPull();
        if (records.length > 0) {
          applyPulledRecords(records);
        }
        return { pulled: records.length, skipped: false };
      }

      const serverMeta: ChecksumMeta = await response.json();
      const localMeta = getStoredChecksumMeta();

      // Simple rule: pull if no local meta OR checksums differ
      const needsPull = !localMeta || localMeta.checksum !== serverMeta.checksum;

      if (!needsPull) {
        return { pulled: 0, skipped: true };
      }

      const records = await syncPull();
      applyPulledRecords(records);
      saveChecksumMeta(serverMeta);

      return { pulled: records.length, skipped: false };
    } catch (error) {
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Sync failed' }));

      // On error, try to pull
      try {
        const records = await syncPull();
        applyPulledRecords(records);
        return { pulled: records.length, skipped: false };
      } catch {
        return { pulled: 0, skipped: false };
      }
    } finally {
      // Don't clear syncInProgressRef here - syncPull handles it
    }
  }, [canSync, syncPull, applyPulledRecords]);

  // === SYNC FULL ===
  const syncFull = useCallback(async (): Promise<{ pushed: number; pulled: number }> => {
    const pushResult = await syncPush();
    const pulled = await syncPull();
    if (pulled.length > 0) {
      applyPulledRecords(pulled);
    }
    return { pushed: pushResult.synced, pulled: pulled.length };
  }, [syncPush, syncPull, applyPulledRecords]);

  // === QUEUE OPERATIONS ===
  const queueBookmark = useCallback((bookmark: Bookmark, version: number, deleted: boolean = false) => {
    if (!canSync()) return;
    if (syncMode === 'plaintext') {
      queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, version, deleted);
      refreshPendingCount();
    }
  }, [canSync, syncMode, refreshPendingCount]);

  const queueSpace = useCallback((space: Space, version: number, deleted: boolean = false) => {
    if (!canSync()) return;
    if (syncMode === 'plaintext') {
      queuePlaintextOperation(space.id, 'space', space, version, deleted);
      refreshPendingCount();
    }
  }, [canSync, refreshPendingCount]);

  const queuePinnedView = useCallback((view: PinnedView, version: number, deleted: boolean = false) => {
    if (!canSync()) return;
    if (syncMode === 'plaintext') {
      queuePlaintextOperation(view.id, 'pinned-view', view, version, deleted);
      refreshPendingCount();
    }
  }, [canSync, refreshPendingCount]);

  const clearPending = useCallback(() => {
    if (syncMode === 'plaintext') {
      clearPlaintextOutbox();
    }
    refreshPendingCount();
  }, [syncMode, refreshPendingCount]);

  return {
    ...state,
    canSync: canSync(),
    syncPush,
    syncPull,
    syncFull,
    checkAndSync,
    queueBookmark,
    queueSpace,
    queuePinnedView,
    clearPending,
    refreshPendingCount,
  };
}

// Hook for queueing encrypted operations (E2E mode)
export function useEncryptedQueue() {
  const { syncMode, syncEnabled } = useSyncSettingsStore();
  const { isUnlocked, vaultKey } = useVaultStore();

  const canQueue = syncEnabled && syncMode === 'e2e' && isUnlocked && vaultKey !== null;

  const queueEncrypted = useCallback((
    recordId: string,
    baseVersion: number,
    ciphertext: string,
    deleted: boolean = false
  ) => {
    if (!canQueue) return;
    queueEncryptedOperation({ recordId, baseVersion, ciphertext, deleted });
  }, [canQueue]);

  return { canQueue, queueEncrypted };
}
