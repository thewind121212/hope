'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BlockedSyncDialog } from '@/components/sync/BlockedSyncDialog';
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
import { clearOutbox as clearEncryptedOutbox } from '@/lib/sync-outbox';
import {
  pushPlaintext,
  pullAllPlaintext,
  queuePlaintextOperation,
  getPendingCount as getPlaintextPendingCount,
  clearOutbox as clearPlaintextOutbox,
} from '@/lib/plaintext-sync-engine';
import { getBookmarks, setBookmarks, getStoredChecksumMeta, saveChecksumMeta, setSkipChecksumRecalculation, invalidateAllCaches, type ChecksumMeta } from '@/lib/storage';
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

  // Invalidate caches after updating sync versions in localStorage
  invalidateAllCaches();
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

  queueBookmark: (bookmark: Bookmark, version: number, deleted?: boolean) => Promise<void>;
  queueSpace: (space: Space, version: number, deleted?: boolean) => Promise<void>;
  queuePinnedView: (view: PinnedView, version: number, deleted?: boolean) => Promise<void>;

  clearPending: () => void;
  refreshPendingCount: () => void;
  canSync: boolean;

  blockedDialog: React.ReactNode;
}

export function useSyncEngine(): UseSyncEngineReturn {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedEncryptedCount, setBlockedEncryptedCount] = useState(0);

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

  const deleteEncryptedCloudData = useCallback(async (): Promise<void> => {
    const res = await fetch('/api/vault/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-encrypted' }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete encrypted cloud data');
    }

    setBlockedEncryptedCount(0);
  }, []);

  const revertVaultToPlaintext = useCallback(async (): Promise<void> => {
    // Reuse existing vault disable flow (passphrase + decrypt + upload plaintext).
    // We trigger it by dispatching a custom event that settings UI listens for.
    window.dispatchEvent(new CustomEvent('vault-revert-requested'));
  }, []);

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
         // SECURITY: This code path only executes when vault is unlocked.
         // canSync() at the top of this function returns false if vault is locked,
         // preventing any E2E pull operations when the vault key is unavailable.
         const pulled = await encryptedPull(() => {});

         // Store pulled ciphertext records in local cache for decryption.
         // Note: these ciphertext records are server-format (single string).
          const { mergePulledCiphertextRecords } = await import('@/lib/encrypted-storage');
          mergePulledCiphertextRecords(
            pulled.records
              .filter((r) => r.ciphertext !== null)
              .map((r) => ({
                recordId: r.recordId,
                recordType: r.recordType,
                ciphertext: r.ciphertext as string,
                version: r.version,
                deleted: r.deleted,
                updatedAt: r.updatedAt,
              }))
          );


          if (vaultKey) {
            try {
              const { decryptAndApplyPulledE2eRecords } = await import('@/lib/decrypt-and-apply');
              const { applied } = await decryptAndApplyPulledE2eRecords(vaultKey);
              if (applied > 0) {
                triggerRefresh();
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to decrypt pulled records';
              console.error('[e2e-sync] decrypt/apply failed', error);
              setState(prev => ({ ...prev, error: message }));
              toast.error('Sync failed', { description: message });
            }
          }

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
      console.error('[sync] pull failed', error);
      setState(prev => ({ ...prev, error: message }));
      toast.error('Sync failed', { description: message });
      return [];
    } finally {
      syncInProgressRef.current = false;
      setState(prev => ({ ...prev, isSyncing: false }));
    }
   }, [canSync, syncMode, setLastSyncAt, triggerRefresh, vaultKey]);

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
        console.log('[e2e-sync] syncPush: starting encrypted push');
        const encResult = await encryptedPush();
        console.log('[e2e-sync] syncPush: encrypted push result', encResult);
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

      if (result.success && result.synced > 0) {
        // Update local sync versions for plaintext mode (has results)
        if (result.results) {
          updateLocalSyncVersions(result.results);
        }
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
      console.error('[sync] push failed', error);
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

    // Invalidate caches after writing pulled records to localStorage
    // This ensures that subsequent reads will fetch fresh data instead of serving stale cache
    invalidateAllCaches();

    // Trigger UI refresh so components re-render
    triggerRefresh();
  }, [triggerRefresh]);

  // === SIMPLIFIED CHECK AND SYNC ===
  const checkAndSync = useCallback(async (): Promise<{ pulled: number; skipped: boolean }> => {
    if (!canSync() || syncInProgressRef.current) {
      return { pulled: 0, skipped: true };
    }

    // For E2E mode, we cannot use plaintext checksum - just do a direct pull
    // The vault must be unlocked (checked by canSync) for security
    if (syncMode === 'e2e') {
      const records = await syncPull();
      // E2E pull handles decryption internally
      return { pulled: records.length, skipped: false };
    }

    // Plaintext mode: use checksum optimization
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

      // Set flag to skip checksum recalculation when applying pulled records
      // We'll use the server's checksum directly since it's the authoritative state
      setSkipChecksumRecalculation(true);
      applyPulledRecords(records);
      setSkipChecksumRecalculation(false);

      // Save the server's checksum (authoritative state)
      saveChecksumMeta(serverMeta);

      return { pulled: records.length, skipped: false };
    } catch (error) {
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Sync failed' }));

      // On error, try to pull
      try {
        const records = await syncPull();
        setSkipChecksumRecalculation(true);
        applyPulledRecords(records);
        setSkipChecksumRecalculation(false);
        return { pulled: records.length, skipped: false };
      } catch {
        return { pulled: 0, skipped: false };
      }
    } finally {
      // Don't clear syncInProgressRef here - syncPull handles it
    }
  }, [canSync, syncMode, syncPull, applyPulledRecords]);

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
  const queueBookmark = useCallback(async (bookmark: Bookmark, version: number, deleted: boolean = false) => {
    if (!canSync()) return;
    
    if (syncMode === 'plaintext') {
      if (blockedDialogOpen) return;
      queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, version, deleted);
      refreshPendingCount();
    } else if (syncMode === 'e2e' && vaultKey) {
      // E2E mode: encrypt and queue
      console.log('[e2e-sync] queueBookmark called', { bookmarkId: bookmark.id, deleted });
      try {
        const { encryptForSync, markDeletedForSync } = await import('@/lib/encrypted-storage');
        
        if (deleted) {
          const result = await markDeletedForSync(bookmark.id, 'bookmark', vaultKey);
          if (result) {
            console.log('[e2e-sync] markDeletedForSync result', result.recordId);
            queueEncryptedOperation({
              recordId: result.recordId,
              recordType: 'bookmark',
              baseVersion: result.version,
              ciphertext: result.ciphertext,
              deleted: true,
            });
            console.log('[e2e-sync] Queued deleted bookmark to outbox');
          }
        } else {
          const result = await encryptForSync(bookmark, 'bookmark', vaultKey);
          console.log('[e2e-sync] encryptForSync result', result.recordId);
          queueEncryptedOperation({
            recordId: result.recordId,
            recordType: 'bookmark',
            baseVersion: result.version,
            ciphertext: result.ciphertext,
            deleted: false,
          });
          console.log('[e2e-sync] Queued encrypted bookmark to outbox');
        }
        refreshPendingCount();
      } catch (error) {
        console.error('[e2e-sync] Failed to encrypt bookmark for sync:', error);
      }
    }
  }, [canSync, syncMode, refreshPendingCount, blockedDialogOpen, vaultKey]);

  const queueSpace = useCallback(async (space: Space, version: number, deleted: boolean = false) => {
    if (!canSync()) return;
    
    if (syncMode === 'plaintext') {
      if (blockedDialogOpen) return;
      queuePlaintextOperation(space.id, 'space', space, version, deleted);
      refreshPendingCount();
    } else if (syncMode === 'e2e' && vaultKey) {
      // E2E mode: encrypt and queue
      try {
        const { encryptForSync, markDeletedForSync } = await import('@/lib/encrypted-storage');
        
        if (deleted) {
          const result = await markDeletedForSync(space.id, 'space', vaultKey);
          if (result) {
            queueEncryptedOperation({
              recordId: result.recordId,
              recordType: 'space',
              baseVersion: result.version,
              ciphertext: result.ciphertext,
              deleted: true,
            });
          }
        } else {
          const result = await encryptForSync(space, 'space', vaultKey);
          queueEncryptedOperation({
            recordId: result.recordId,
            recordType: 'space',
            baseVersion: result.version,
            ciphertext: result.ciphertext,
            deleted: false,
          });
        }
        refreshPendingCount();
      } catch (error) {
        console.error('[e2e-sync] Failed to encrypt space for sync:', error);
      }
    }
  }, [canSync, syncMode, refreshPendingCount, blockedDialogOpen, vaultKey]);

  const queuePinnedView = useCallback(async (view: PinnedView, version: number, deleted: boolean = false) => {
    if (!canSync()) return;
    
    if (syncMode === 'plaintext') {
      if (blockedDialogOpen) return;
      queuePlaintextOperation(view.id, 'pinned-view', view, version, deleted);
      refreshPendingCount();
    } else if (syncMode === 'e2e' && vaultKey) {
      // E2E mode: encrypt and queue
      try {
        const { encryptForSync, markDeletedForSync } = await import('@/lib/encrypted-storage');
        
        if (deleted) {
          const result = await markDeletedForSync(view.id, 'pinned-view', vaultKey);
          if (result) {
            queueEncryptedOperation({
              recordId: result.recordId,
              recordType: 'pinned-view',
              baseVersion: result.version,
              ciphertext: result.ciphertext,
              deleted: true,
            });
          }
        } else {
          const result = await encryptForSync(view, 'pinned-view', vaultKey);
          queueEncryptedOperation({
            recordId: result.recordId,
            recordType: 'pinned-view',
            baseVersion: result.version,
            ciphertext: result.ciphertext,
            deleted: false,
          });
        }
        refreshPendingCount();
      } catch (error) {
        console.error('[e2e-sync] Failed to encrypt pinned view for sync:', error);
      }
    }
  }, [canSync, syncMode, refreshPendingCount, blockedDialogOpen, vaultKey]);

  const clearPending = useCallback(() => {
    if (syncMode === 'plaintext') {
      clearPlaintextOutbox();
    } else if (syncMode === 'e2e') {
      clearEncryptedOutbox();
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
    blockedDialog: React.createElement(BlockedSyncDialog, {
      isOpen: blockedDialogOpen,
      onClose: () => setBlockedDialogOpen(false),
      encryptedRecordCount: blockedEncryptedCount,
      onRevertToPlaintext: revertVaultToPlaintext,
      onDeleteEncryptedCloudData: async () => {
        await deleteEncryptedCloudData();
        setBlockedDialogOpen(false);
      },
    }),
  };
}

// Hook for queueing encrypted operations (E2E mode)
export function useEncryptedQueue() {
  const { syncMode, syncEnabled } = useSyncSettingsStore();
  const { isUnlocked, vaultKey } = useVaultStore();

  const canQueue = syncEnabled && syncMode === 'e2e' && isUnlocked && vaultKey !== null;

  const queueEncrypted = useCallback((
    recordId: string,
    recordType: RecordType,
    baseVersion: number,
    ciphertext: string,
    deleted: boolean = false
  ) => {
    if (!canQueue) return;
    queueEncryptedOperation({ recordId, recordType, baseVersion, ciphertext, deleted });
  }, [canQueue]);

  return { canQueue, queueEncrypted };
}
