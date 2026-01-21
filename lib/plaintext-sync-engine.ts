/**
 * Plaintext Sync Engine
 *
 * Handles syncing data to cloud without E2E encryption.
 * Data is stored as plaintext JSONB on the server.
 */

import type {
  Bookmark,
  Space,
  PinnedView,
  RecordType,
  PlaintextRecord,
  SyncPushResult,
  SyncConflict,
} from '@/lib/types';
import { saveChecksumMeta, type ChecksumMeta } from '@/lib/storage';

// Outbox for pending operations
const OUTBOX_KEY = 'plaintext-sync-outbox';

export interface PlaintextSyncOperation {
  id: string;
  recordId: string;
  recordType: RecordType;
  data: Bookmark | Space | PinnedView;
  baseVersion: number;
  deleted: boolean;
  createdAt: number;
  retries: number;
}

// Load outbox from localStorage
export function loadOutbox(): PlaintextSyncOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(OUTBOX_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save outbox to localStorage
export function saveOutbox(operations: PlaintextSyncOperation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(operations));
}

// Add operation to outbox
export function queuePlaintextOperation(
  recordId: string,
  recordType: RecordType,
  data: Bookmark | Space | PinnedView,
  baseVersion: number,
  deleted: boolean = false
): void {
  const outbox = loadOutbox();
  
  // Check if operation for this record already exists
  const existingIndex = outbox.findIndex(
    op => op.recordId === recordId && op.recordType === recordType
  );
  
  const operation: PlaintextSyncOperation = {
    id: crypto.randomUUID(),
    recordId,
    recordType,
    data,
    baseVersion,
    deleted,
    createdAt: Date.now(),
    retries: 0,
  };

  if (existingIndex >= 0) {
    // Replace existing operation with newer one
    outbox[existingIndex] = operation;
  } else {
    outbox.push(operation);
  }
  
  saveOutbox(outbox);
}

// Remove operations from outbox
export function removeFromOutbox(ids: string[]): void {
  const outbox = loadOutbox();
  const filtered = outbox.filter(op => !ids.includes(op.id));
  saveOutbox(filtered);
}

// Clear entire outbox
export function clearOutbox(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OUTBOX_KEY);
}

// Push operations to server
export async function pushPlaintext(
  maxOperations: number = 50
): Promise<SyncPushResult> {
  const outbox = loadOutbox();
  
  if (outbox.length === 0) {
    return { success: true, synced: 0, conflicts: [], errors: [] };
  }

  // Take batch of operations
  const batch = outbox.slice(0, maxOperations);
  
  try {
    const response = await fetch('/api/sync/plaintext/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: batch.map(op => ({
          recordId: op.recordId,
          recordType: op.recordType,
          data: op.data,
          baseVersion: op.baseVersion,
          deleted: op.deleted,
        })),
      }),
    });

    if (response.status === 401) {
      return { success: false, synced: 0, conflicts: [], errors: ['Unauthorized'] };
    }

    const result = await response.json();

    if (response.status === 409) {
      // Conflicts - remove successful operations, keep conflicts for retry
      const conflictIds = new Set(result.conflicts.map((c: SyncConflict) => c.recordId));
      const successfulIds = batch
        .filter(op => !conflictIds.has(op.recordId))
        .map(op => op.id);
      removeFromOutbox(successfulIds);

      return {
        success: false,
        synced: successfulIds.length,
        conflicts: result.conflicts,
        errors: [],
        results: result.results,
      };
    }

    if (!response.ok) {
      // Increment retry count for failed operations
      const updatedOutbox = outbox.map(op => {
        if (batch.some(b => b.id === op.id)) {
          return { ...op, retries: op.retries + 1 };
        }
        return op;
      });
      saveOutbox(updatedOutbox);
      
      return {
        success: false,
        synced: 0,
        conflicts: [],
        errors: [result.error || 'Push failed'],
      };
    }

    // Success - remove synced operations
    removeFromOutbox(batch.map(op => op.id));

    // Save checksum metadata if returned from server
    if (result.checksum && result.checksumMeta) {
      saveChecksumMeta({
        checksum: result.checksum,
        count: result.checksumMeta.count,
        lastUpdate: result.checksumMeta.lastUpdate,
        perTypeCounts: {
          bookmarks: 0,
          spaces: 0,
          pinnedViews: 0,
        },
      });
    }

    return {
      success: true,
      synced: batch.length,
      conflicts: [],
      errors: [],
      results: result.results,
    };
  } catch (error) {
    return {
      success: false,
      synced: 0,
      conflicts: [],
      errors: [error instanceof Error ? error.message : 'Network error'],
    };
  }
}

// Pull records from server
export async function pullPlaintext(
  cursor?: string,
  recordType?: RecordType,
  limit: number = 100
): Promise<{
  records: PlaintextRecord[];
  nextCursor?: string;
  hasMore: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (recordType) params.set('recordType', recordType);
    params.set('limit', limit.toString());

    console.log('🌐 Fetching pull:', `/api/sync/plaintext/pull?${params}`);

    const response = await fetch(`/api/sync/plaintext/pull?${params}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (response.status === 401) {
      return { records: [], hasMore: false, error: 'Unauthorized' };
    }

    if (!response.ok) {
      const result = await response.json();
      console.error('❌ Pull response not OK:', response.status, result);
      return { records: [], hasMore: false, error: result.error || 'Pull failed' };
    }

    const result = await response.json();
    console.log('📦 Pull API response:', {
      recordsCount: result.records?.length ?? 0,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
    return {
      records: result.records,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  } catch (error) {
    return {
      records: [],
      hasMore: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Pull all records (handles pagination)
export async function pullAllPlaintext(
  recordType?: RecordType
): Promise<{
  records: PlaintextRecord[];
  error?: string;
}> {
  console.log('🔄 Starting pullAllPlaintext...');
  const allRecords: PlaintextRecord[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let iterations = 0;
  const maxIterations = 100; // Safety limit

  while (hasMore && iterations < maxIterations) {
    iterations++;
    console.log(`🔄 Pull iteration ${iterations}, cursor:`, cursor);

    const result = await pullPlaintext(cursor, recordType);

    console.log(`  → Result: ${result.records.length} records, hasMore: ${result.hasMore}, error: ${result.error}`);

    if (result.error) {
      console.error('❌ Pull error:', result.error);
      return { records: allRecords, error: result.error };
    }

    allRecords.push(...result.records);
    cursor = result.nextCursor;
    hasMore = result.hasMore;
  }

  console.log(`✅ Pull complete: ${allRecords.length} total records in ${iterations} iterations`);
  return { records: allRecords };
}

// Get count of pending operations
export function getPendingCount(): number {
  return loadOutbox().length;
}

// Get operations that have failed multiple times
export function getFailedOperations(maxRetries: number = 3): PlaintextSyncOperation[] {
  return loadOutbox().filter(op => op.retries >= maxRetries);
}
