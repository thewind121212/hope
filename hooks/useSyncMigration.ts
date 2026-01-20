"use client";

/**
 * useSyncMigration Hook
 * 
 * Handles the migration flow when a user signs in and has both local
 * and cloud data that may need to be merged.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import { useVaultStore } from '@/stores/vault-store';
import { useDataRefreshStore } from '@/stores/data-refresh-store';
import { 
  mergeAllData, 
  hasData, 
  countDataSet,
  type MergeStrategy,
  type DataSet,
} from '@/lib/merge-data';
import { pullAllPlaintext, queuePlaintextOperation, clearOutbox } from '@/lib/plaintext-sync-engine';
import { getBookmarks, setBookmarks } from '@/lib/storage';
import { getSpaces, setSpaces } from '@/lib/spacesStorage';
import { getPinnedViews, savePinnedViews } from '@/lib/pinnedViewsStorage';
import type { Bookmark, Space, PinnedView, PlaintextRecord } from '@/lib/types';

export type MigrationStatus = 
  | 'idle'
  | 'checking'
  | 'conflict-detected'
  | 'migrating'
  | 'complete'
  | 'error';

export interface MigrationState {
  status: MigrationStatus;
  localData: DataSet | null;
  cloudData: DataSet | null;
  error?: string;
}

export interface MigrationActions {
  checkForConflict: () => Promise<boolean>;
  resolveMigration: (strategy: MergeStrategy) => Promise<void>;
}

const MIGRATION_CHECKED_KEY = 'sync-migration-checked';

export function useSyncMigration(): MigrationState & MigrationActions {
  const { isSignedIn, isLoaded } = useAuth();
  const { syncMode, loadFromServer } = useSyncSettingsStore();
  const { vaultEnvelope } = useVaultStore();
  const { triggerRefresh } = useDataRefreshStore();
  
  const [state, setState] = useState<MigrationState>({
    status: 'idle',
    localData: null,
    cloudData: null,
  });

  // Check if migration was already handled
  const wasMigrationChecked = useCallback(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(MIGRATION_CHECKED_KEY) === 'true';
  }, []);

  const markMigrationChecked = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MIGRATION_CHECKED_KEY, 'true');
  }, []);

  // Load local data from localStorage
  const loadLocalData = useCallback((): DataSet => {
    return {
      bookmarks: getBookmarks(),
      spaces: getSpaces(),
      pinnedViews: getPinnedViews(),
    };
  }, []);

  // Load cloud data from server
  const loadCloudData = useCallback(async (): Promise<DataSet | null> => {
    try {
      const result = await pullAllPlaintext();
      
      if (result.error) {
        console.error('Failed to pull cloud data:', result.error);
        return null;
      }

      const bookmarks: Bookmark[] = [];
      const spaces: Space[] = [];
      const pinnedViews: PinnedView[] = [];

      for (const record of result.records) {
        if (record.deleted) continue;

        const plaintextRecord = record as PlaintextRecord;
        switch (plaintextRecord.recordType) {
          case 'bookmark':
            bookmarks.push({
              ...(plaintextRecord.data as Bookmark),
              _syncVersion: plaintextRecord.version,
            });
            break;
          case 'space':
            spaces.push({
              ...(plaintextRecord.data as Space),
              _syncVersion: plaintextRecord.version,
            });
            break;
          case 'pinned-view':
            pinnedViews.push({
              ...(plaintextRecord.data as PinnedView),
              _syncVersion: plaintextRecord.version,
            });
            break;
        }
      }

      return { bookmarks, spaces, pinnedViews };
    } catch (error) {
      console.error('Error loading cloud data:', error);
      return null;
    }
  }, []);

  // Apply cloud data to local storage
  const applyCloudData = useCallback((data: DataSet) => {
    setBookmarks(data.bookmarks);
    setSpaces(data.spaces);
    savePinnedViews(data.pinnedViews);
    // Trigger refresh so React state updates from localStorage
    triggerRefresh();
  }, [triggerRefresh]);

  // Upload local data to cloud
  const uploadLocalData = useCallback((data: DataSet) => {
    // Clear any existing outbox
    clearOutbox();

    // Queue all local data for sync (use _syncVersion if available)
    for (const bookmark of data.bookmarks) {
      queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, bookmark._syncVersion ?? 0, false);
    }
    for (const space of data.spaces) {
      queuePlaintextOperation(space.id, 'space', space, space._syncVersion ?? 0, false);
    }
    for (const pinnedView of data.pinnedViews) {
      queuePlaintextOperation(pinnedView.id, 'pinned-view', pinnedView, pinnedView._syncVersion ?? 0, false);
    }
  }, []);

  // Check if there's a conflict between local and cloud data
  const checkForConflict = useCallback(async (): Promise<boolean> => {
    // Skip if not signed in, already checked, or using E2E
    if (!isSignedIn || wasMigrationChecked() || vaultEnvelope) {
      return false;
    }

    // Only check for plaintext sync mode
    if (syncMode !== 'plaintext') {
      return false;
    }

    setState(prev => ({ ...prev, status: 'checking' }));

    try {
      const localData = loadLocalData();
      const cloudData = await loadCloudData();

      if (!cloudData) {
        // No cloud data or error - no conflict
        markMigrationChecked();
        setState({ status: 'idle', localData: null, cloudData: null });
        return false;
      }

      const hasLocalData = hasData(localData);
      const hasCloudData = hasData(cloudData);

      if (!hasLocalData && !hasCloudData) {
        // Neither has data - no conflict
        markMigrationChecked();
        setState({ status: 'idle', localData: null, cloudData: null });
        return false;
      }

      if (!hasLocalData && hasCloudData) {
        // Only cloud has data - auto-import to local
        applyCloudData(cloudData);
        markMigrationChecked();
        setState({ status: 'complete', localData: null, cloudData: null });
        return false;
      }

      if (hasLocalData && !hasCloudData) {
        // Only local has data - auto-upload to cloud
        uploadLocalData(localData);
        markMigrationChecked();
        setState({ status: 'complete', localData, cloudData: null });
        return false;
      }

      // Both have data - conflict detected!
      setState({
        status: 'conflict-detected',
        localData,
        cloudData,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration check failed';
      setState({
        status: 'error',
        localData: null,
        cloudData: null,
        error: errorMessage,
      });
      return false;
    }
  }, [isSignedIn, wasMigrationChecked, vaultEnvelope, syncMode, loadLocalData, loadCloudData, markMigrationChecked, applyCloudData, uploadLocalData]);

  // Resolve the migration with a chosen strategy
  const resolveMigration = useCallback(async (strategy: MergeStrategy) => {
    const { localData, cloudData } = state;
    
    if (!localData || !cloudData) {
      throw new Error('No data to merge');
    }

    setState(prev => ({ ...prev, status: 'migrating' }));

    try {
      const merged = mergeAllData(localData, cloudData, {
        strategy,
        dedupeBookmarksByUrl: true,
      });

      // Save merged data to local storage
      setBookmarks(merged.bookmarks.items);
      setSpaces(merged.spaces.items);
      savePinnedViews(merged.pinnedViews.items);

      // Upload merged data to cloud (use _syncVersion if available)
      clearOutbox();

      for (const bookmark of merged.bookmarks.items) {
        queuePlaintextOperation(bookmark.id, 'bookmark', bookmark, bookmark._syncVersion ?? 0, false);
      }
      for (const space of merged.spaces.items) {
        queuePlaintextOperation(space.id, 'space', space, space._syncVersion ?? 0, false);
      }
      for (const pinnedView of merged.pinnedViews.items) {
        queuePlaintextOperation(pinnedView.id, 'pinned-view', pinnedView, pinnedView._syncVersion ?? 0, false);
      }

      markMigrationChecked();
      
      // Trigger refresh so React state updates from localStorage
      triggerRefresh();
      
      setState({
        status: 'complete',
        localData: null,
        cloudData: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
      throw error;
    }
  }, [state, markMigrationChecked, triggerRefresh]);

  return {
    ...state,
    checkForConflict,
    resolveMigration,
  };
}
