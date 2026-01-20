import { getOutbox, addToOutbox, removeFromOutbox, updateOutboxItem, clearOutbox, type SyncOperation } from './sync-outbox';

export interface SyncResult {
  success: boolean;
  pushed: number;
  conflicts: { recordId: string; currentVersion: number }[];
  error?: string;
}

export interface PullResult {
  success: boolean;
  records: { recordId: string; ciphertext: string; version: number; deleted: boolean; updatedAt: string }[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
}

const PUSH_URL = '/api/sync/push';
const PULL_URL = '/api/sync/pull';
const MAX_BATCH_SIZE = 50;
const MAX_RETRIES = 3;

async function pushOperations(operations: SyncOperation[]): Promise<SyncResult> {
  const response = await fetch(PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      const data = await response.json();
      return { success: false, pushed: 0, conflicts: data.conflicts || [] };
    }
    throw new Error(`Push failed: ${response.statusText}`);
  }

  const data = await response.json();
  return { success: true, pushed: operations.length, conflicts: [] };
}

async function pullRecords(cursor?: string, limit: number = 100): Promise<PullResult> {
  const url = new URL(PULL_URL, window.location.origin);
  if (cursor) url.searchParams.set('cursor', cursor);
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Pull failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    records: data.records,
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
  };
}

async function processOutboxItem(op: SyncOperation): Promise<void> {
  try {
    const result = await pushOperations([op]);
    if (result.success) {
      removeFromOutbox(op.id);
    } else if (result.conflicts.length > 0) {
      for (const conflict of result.conflicts) {
        if (conflict.recordId === op.recordId) {
          if (op.retries >= MAX_RETRIES) {
            removeFromOutbox(op.id);
          } else {
            updateOutboxItem(op.id, { retries: op.retries + 1 });
          }
        }
      }
    }
  } catch (error) {
    if (op.retries >= MAX_RETRIES) {
      removeFromOutbox(op.id);
    } else {
      updateOutboxItem(op.id, { retries: op.retries + 1 });
    }
  }
}

export async function syncPush(): Promise<SyncResult> {
  const outbox = getOutbox();
  if (outbox.length === 0) {
    return { success: true, pushed: 0, conflicts: [] };
  }

  let allPushed = 0;
  const allConflicts: { recordId: string; currentVersion: number }[] = [];

  for (let i = 0; i < outbox.length; i += MAX_BATCH_SIZE) {
    const batch = outbox.slice(i, i + MAX_BATCH_SIZE);
    const result = await pushOperations(batch);
    allPushed += result.pushed;
    allConflicts.push(...result.conflicts);

    if (!result.success) {
      return { success: false, pushed: allPushed, conflicts: allConflicts };
    }
  }

  clearOutbox();
  return { success: true, pushed: allPushed, conflicts: allConflicts };
}

export async function syncPull(onProgress?: (records: number, hasMore: boolean) => void): Promise<PullResult> {
  let cursor: string | undefined;
  let totalRecords = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await pullRecords(cursor);
    if (!result.success) {
      return { ...result, error: result.error };
    }

    for (const record of result.records) {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('vault-sync');
        channel.postMessage({ type: 'RECORD_RECEIVED', record });
      }
    }

    totalRecords += result.records.length;
    hasMore = result.hasMore;
    cursor = result.nextCursor || undefined;

    if (onProgress) {
      onProgress(totalRecords, hasMore);
    }
  }

  return {
    success: true,
    records: [],
    nextCursor: null,
    hasMore: false,
  };
}

export async function syncFull(): Promise<{ push: SyncResult; pull: PullResult }> {
  const pushResult = await syncPush();
  const pullResult = await syncPull();

  return { push: pushResult, pull: pullResult };
}

export function queueOperation(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retries'>): void {
  addToOutbox(operation);
}

export function getPendingCount(): number {
  return getOutbox().length;
}
