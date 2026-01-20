'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import { useVaultStore } from '@/stores/vault-store';
import type { 
  Bookmark, 
  Space, 
  PinnedView, 
  RecordType,
  SyncPushResult,
  PlaintextRecord,
} from '@/lib/types';

// Import both sync engines
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
import { getBookmarks, setBookmarks } from '@/lib/storage';
import { getSpaces, setSpaces } from '@/lib/spacesStorage';
import { getPinnedViews, savePinnedViews } from '@/lib/pinnedViewsStorage';

// Helper to update local _syncVersion after successful push
function updateLocalSyncVersions(results: { recordId: string; version: number }[]): void {
  if (!results || results.length === 0) return;

  // Create a map for quick lookup
  const versionMap = new Map(results.map(r => [r.recordId, r.version]));

  // Update bookmarks
  const bookmarks = getBookmarks();
  let bookmarksUpdated = false;
  for (const bookmark of bookmarks) {
    const newVersion = versionMap.get(bookmark.id);
    if (newVersion !== undefined) {
      bookmark._syncVersion = newVersion;
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
  progress: number; // 0-100
}

interface UseSyncEngineReturn extends SyncState {
  // Core sync methods
  syncPush: () => Promise<SyncPushResult>;
  syncPull: () => Promise<PlaintextRecord[]>;
  syncFull: () => Promise<{ pushed: number; pulled: number }>;
  
  // Queue operations
  queueBookmark: (bookmark: Bookmark, version: number, deleted?: boolean) => void;
  queueSpace: (space: Space, version: number, deleted?: boolean) => void;
  queuePinnedView: (view: PinnedView, version: number, deleted?: boolean) => void;
  
  // Utils
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
    progress: 0,
  });

  const { syncMode, syncEnabled, setLastSyncAt } = useSyncSettingsStore();
  const { isUnlocked, vaultEnvelope, vaultKey } = useVaultStore();
  
  // Ref to track if sync is in progress (prevents concurrent syncs)
  const syncInProgressRef = useRef(false);

  // Can sync check
  const canSync = useCallback(() => {
    if (!syncEnabled || syncMode === 'off') return false;
    if (syncMode === 'e2e') {
      return isUnlocked && vaultEnvelope !== null && vaultKey !== null;
    }
    return true; // Plaintext mode just needs to be enabled
  }, [syncMode, syncEnabled, isUnlocked, vaultEnvelope, vaultKey]);

  // Refresh pending count based on sync mode
  const refreshPendingCount = useCallback(() => {
    if (syncMode === 'e2e') {
      setState(prev => ({ ...prev, pendingCount: getEncryptedPendingCount() }));
    } else if (syncMode === 'plaintext') {
      setState(prev => ({ ...prev, pendingCount: getPlaintextPendingCount() }));
    } else {
      setState(prev => ({ ...prev, pendingCount: 0 }));
    }
  }, [syncMode]);

  // Load last sync time and pending count on mount
  useEffect(() => {
    refreshPendingCount();

    // Listen for sync events from other tabs
    const channel = new BroadcastChannel('sync-events');
    channel.onmessage = (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        setState(prev => ({ ...prev, lastSync: new Date() }));
        refreshPendingCount();
      }
    };

    // Load last sync from localStorage
    const stored = localStorage.getItem('last-sync-time');
    if (stored) {
      setState(prev => ({ ...prev, lastSync: new Date(stored) }));
    }

    return () => channel.close();
  }, [refreshPendingCount]);

  // Push operations to server
  const syncPush = useCallback(async (): Promise<SyncPushResult> => {
    if (!canSync()) {
      return { success: false, synced: 0, conflicts: [], errors: ['Sync not available'] };
    }

    if (syncInProgressRef.current) {
      return { success: false, synced: 0, conflicts: [], errors: ['Sync already in progress'] };
    }

    syncInProgressRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, error: null, progress: 0 }));

    try {
      let result: SyncPushResult;

      if (syncMode === 'e2e') {
        // Use encrypted sync
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
        // Use plaintext sync
        result = await pushPlaintext();
      }

      setState(prev => ({ ...prev, progress: 100 }));

      if (result.success) {
        // Update local _syncVersion with server versions (only when items were synced)
        if (result.synced > 0 && result.results) {
          updateLocalSyncVersions(result.results);
          // Show sync success toast only when items were actually synced
          toast.success('Synced to cloud');
        }

        const now = new Date();
        setState(prev => ({ ...prev, lastSync: now }));
        setLastSyncAt(now.toISOString());
        localStorage.setItem('last-sync-time', now.toISOString());

        // Notify other tabs
        const channel = new BroadcastChannel('sync-events');
        channel.postMessage({ type: 'SYNC_COMPLETE' });
        channel.close();
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
  }, [canSync, syncMode, refreshPendingCount, setLastSyncAt]);

  // Pull records from server
  const syncPull = useCallback(async (): Promise<PlaintextRecord[]> => {
    if (!canSync()) {
      return [];
    }

    if (syncInProgressRef.current) {
      return [];
    }

    syncInProgressRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, error: null, progress: 0 }));

    try {
      let records: PlaintextRecord[] = [];

      if (syncMode === 'e2e') {
        // Use encrypted sync - records need to be decrypted by caller
        await encryptedPull((pulled, hasMore) => {
          setState(prev => ({ ...prev, progress: hasMore ? 50 : 100 }));
        });
        // Note: For E2E, the actual records are sent via BroadcastChannel
        // and handled by useIncomingSync hook
      } else {
        // Use plaintext sync
        const result = await pullAllPlaintext();
        if (result.error) {
          throw new Error(result.error);
        }
        records = result.records;
      }

      const now = new Date();
      setState(prev => ({ ...prev, lastSync: now, progress: 100 }));
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

  // Full sync (push then pull)
  const syncFull = useCallback(async (): Promise<{ pushed: number; pulled: number }> => {
    const pushResult = await syncPush();
    const pulled = await syncPull();
    return { pushed: pushResult.synced, pulled: pulled.length };
  }, [syncPush, syncPull]);

  // Queue bookmark for sync
  const queueBookmark = useCallback((
    bookmark: Bookmark,
    version: number,
    deleted: boolean = false
  ) => {
    if (!canSync()) return;

    if (syncMode === 'e2e') {
      // For E2E, we need to encrypt first - this should be handled by the caller
      // who has access to the vault key
      console.warn('E2E queue should be handled with encryption');
    } else {
      queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, version, deleted);
    }
    refreshPendingCount();
  }, [canSync, syncMode, refreshPendingCount]);

  // Queue space for sync
  const queueSpace = useCallback((
    space: Space,
    version: number,
    deleted: boolean = false
  ) => {
    if (!canSync()) return;

    if (syncMode === 'plaintext') {
      queuePlaintextOperation(space.id, 'space', space, version, deleted);
    }
    // E2E space sync not yet implemented
    refreshPendingCount();
  }, [canSync, syncMode, refreshPendingCount]);

  // Queue pinned view for sync
  const queuePinnedView = useCallback((
    view: PinnedView,
    version: number,
    deleted: boolean = false
  ) => {
    if (!canSync()) return;

    if (syncMode === 'plaintext') {
      queuePlaintextOperation(view.id, 'pinned-view', view, version, deleted);
    }
    // E2E pinned view sync not yet implemented
    refreshPendingCount();
  }, [canSync, syncMode, refreshPendingCount]);

  // Clear all pending operations
  const clearPending = useCallback(() => {
    if (syncMode === 'plaintext') {
      clearPlaintextOutbox();
    }
    // For E2E, use the existing clear function from sync-outbox
    refreshPendingCount();
  }, [syncMode, refreshPendingCount]);

  return {
    ...state,
    canSync: canSync(),
    syncPush,
    syncPull,
    syncFull,
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
