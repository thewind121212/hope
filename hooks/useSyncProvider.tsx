"use client";

/**
 * SyncProvider
 * 
 * Provides a unified sync context that:
 * - Auto-syncs on CRUD operations
 * - Handles sync-on-mount (pulls latest on app load)
 * - Manages periodic sync (every 5 min)
 * - Handles online/offline status
 * - Triggers migration check on sign-in
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import { useVaultStore } from '@/stores/vault-store';
import { useSyncEngine } from '@/hooks/useSyncEngineUnified';
import { useSyncMigration } from '@/hooks/useSyncMigration';
import { MigrationDialog } from '@/components/sync/MigrationDialog';
import type { Bookmark, Space, PinnedView, SyncPushResult, PlaintextRecord } from '@/lib/types';
import type { MergeStrategy } from '@/lib/merge-data';

// Auto-sync debounce time (ms)
const SYNC_DEBOUNCE_MS = 2000;
// Periodic sync interval (ms)
const PERIODIC_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface SyncContextValue {
  // Sync state
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
  isOnline: boolean;
  canSync: boolean;
  checksumMatched: boolean;
  isCheckingMigration: boolean;

  // Sync actions
  syncNow: () => Promise<{ pushed: number; pulled: number }>;
  
  // Queue operations (automatically triggers debounced sync)
  queueBookmarkSync: (bookmark: Bookmark, deleted?: boolean) => void;
  queueSpaceSync: (space: Space, deleted?: boolean) => void;
  queuePinnedViewSync: (view: PinnedView, deleted?: boolean) => void;

  // Pull latest data
  pullLatest: () => Promise<PlaintextRecord[]>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { syncMode, syncEnabled, loadFromServer } = useSyncSettingsStore();
  const { vaultEnvelope, isUnlocked } = useVaultStore();
  
  const syncEngine = useSyncEngine();
  const migration = useSyncMigration();
  
  const [isOnline, setIsOnline] = useState(true);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [checksumMatched, setChecksumMatched] = useState(false);
  
  // Refs for debouncing and intervals
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);
  const hasPulledOnMountRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load sync settings from server on sign-in
  useEffect(() => {
    if (isSignedIn && isLoaded && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadFromServer();
    }
  }, [isSignedIn, isLoaded, loadFromServer]);

  // Check for migration conflicts on sign-in
  useEffect(() => {
    if (!isSignedIn || !isLoaded || !syncEnabled) return;
    if (syncMode !== 'plaintext') return; // Only check for plaintext mode
    if (migration.status !== 'idle') return;

    const checkMigration = async () => {
      const hasConflict = await migration.checkForConflict();
      if (hasConflict) {
        setShowMigrationDialog(true);
      }
    };

    // Delay slightly to let UI settle
    const timer = setTimeout(checkMigration, 500);
    return () => clearTimeout(timer);
  }, [isSignedIn, isLoaded, syncEnabled, syncMode, migration]);

  // Pull on mount (initial sync) - with checksum optimization
  useEffect(() => {
    if (!isSignedIn || !isLoaded || !syncEngine.canSync) return;
    if (hasPulledOnMountRef.current) return;
    if (migration.status === 'conflict-detected' || migration.status === 'migrating') return;

    hasPulledOnMountRef.current = true;

    // Check checksum before pulling (optimized startup)
    syncEngine.checkAndSync()
      .then(({ pulled, skipped }) => {
        setChecksumMatched(skipped);
        if (pulled > 0) {
          toast.success('Up to date from cloud');
        }
      })
      .catch(console.error);
  }, [isSignedIn, isLoaded, syncEngine.canSync, migration.status, syncEngine.checkAndSync]);

  // Periodic sync
  useEffect(() => {
    if (!syncEngine.canSync || !isOnline) {
      if (periodicSyncIntervalRef.current) {
        clearInterval(periodicSyncIntervalRef.current);
        periodicSyncIntervalRef.current = null;
      }
      return;
    }

    periodicSyncIntervalRef.current = setInterval(() => {
      if (syncEngine.pendingCount > 0) {
        syncEngine.syncPush().catch(console.error);
      }
    }, PERIODIC_SYNC_INTERVAL_MS);

    return () => {
      if (periodicSyncIntervalRef.current) {
        clearInterval(periodicSyncIntervalRef.current);
      }
    };
  }, [syncEngine.canSync, isOnline, syncEngine.pendingCount, syncEngine.syncPush]);

  // Debounced auto-sync after queuing operations
  const triggerDebouncedSync = useCallback(() => {
    if (!syncEngine.canSync || !isOnline) return;

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Schedule sync
    syncTimeoutRef.current = setTimeout(() => {
      syncEngine.syncPush().catch(console.error);
    }, SYNC_DEBOUNCE_MS);
  }, [syncEngine.canSync, isOnline, syncEngine.syncPush]);

  // Queue bookmark for sync
  const queueBookmarkSync = useCallback((bookmark: Bookmark, deleted: boolean = false) => {
    syncEngine.queueBookmark(bookmark, bookmark._syncVersion ?? 0, deleted);
    triggerDebouncedSync();
  }, [syncEngine, triggerDebouncedSync]);

  // Queue space for sync
  const queueSpaceSync = useCallback((space: Space, deleted: boolean = false) => {
    syncEngine.queueSpace(space, space._syncVersion ?? 0, deleted);
    triggerDebouncedSync();
  }, [syncEngine, triggerDebouncedSync]);

  // Queue pinned view for sync
  const queuePinnedViewSync = useCallback((view: PinnedView, deleted: boolean = false) => {
    syncEngine.queuePinnedView(view, view._syncVersion ?? 0, deleted);
    triggerDebouncedSync();
  }, [syncEngine, triggerDebouncedSync]);

  // Manual sync now
  const syncNow = useCallback(async () => {
    return syncEngine.syncFull();
  }, [syncEngine]);

  // Pull latest
  const pullLatest = useCallback(async () => {
    return syncEngine.syncPull();
  }, [syncEngine]);

  // Migration handlers
  const handleMigrationResolve = useCallback(async (strategy: MergeStrategy) => {
    await migration.resolveMigration(strategy);
    setShowMigrationDialog(false);
    // After migration, pull to get synced state
    await syncEngine.syncPull();
  }, [migration, syncEngine]);

  const handleLogout = useCallback(async () => {
    // Use Clerk's signOut method
    await (window as any).Clerk?.signOut?.();
    window.location.href = '/';
  }, []);

  const value: SyncContextValue = {
    isSyncing: syncEngine.isSyncing,
    pendingCount: syncEngine.pendingCount,
    lastSync: syncEngine.lastSync,
    error: syncEngine.error,
    isOnline,
    canSync: syncEngine.canSync,
    checksumMatched,
    isCheckingMigration: migration.status === 'checking',
    syncNow,
    queueBookmarkSync,
    queueSpaceSync,
    queuePinnedViewSync,
    pullLatest,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
      
      {/* Migration dialog */}
      {showMigrationDialog && migration.localData && migration.cloudData && (
        <MigrationDialog
          isOpen={showMigrationDialog}
          onClose={() => setShowMigrationDialog(false)}
          localData={migration.localData}
          cloudData={migration.cloudData}
          onResolve={handleMigrationResolve}
          onLogout={handleLogout}
        />
      )}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

// Optional hook for components that may not be within SyncProvider
export function useSyncOptional(): SyncContextValue | null {
  return useContext(SyncContext);
}
