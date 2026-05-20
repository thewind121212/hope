import { getOutbox, addToOutbox, clearOutbox, type SyncOperation } from './sync-outbox';


export interface SyncResult {
  success: boolean;
  pushed: number;
  conflicts: { recordId: string; currentVersion: number }[];
  results?: { recordId: string; version: number; updatedAt: string }[];
  error?: string;
}

export interface PullResult {
  success: boolean;
  records: {
    recordId: string;
    recordType: import('@/lib/types').RecordType;
    ciphertext: string;
    version: number;
    deleted: boolean;
    updatedAt: string;
  }[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
}

const PUSH_URL = '/api/sync/push';
const PULL_URL = '/api/sync/pull';
const MAX_BATCH_SIZE = 50;

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
  return { success: true, pushed: operations.length, conflicts: [], results: data.results };
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

export async function syncPush(): Promise<SyncResult> {
  const outbox = getOutbox();
  if (outbox.length === 0) {
    return { success: true, pushed: 0, conflicts: [] };
  }

  // De-dupe by record key (last write wins) using a strict ordering tuple
  // (createdAt, id) so same-millisecond timestamps don't collide.
  const latestByKey = new Map<string, SyncOperation>();
  for (const op of outbox) {
    const key = `${op.recordType}:${op.recordId}`;
    const existing = latestByKey.get(key);
    if (
      !existing ||
      op.createdAt > existing.createdAt ||
      (op.createdAt === existing.createdAt && op.id > existing.id)
    ) {
      latestByKey.set(key, op);
    }
  }
  const dedupedOutbox = Array.from(latestByKey.values()).sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt - b.createdAt,
  );

  let allPushed = 0;
  const allConflicts: { recordId: string; currentVersion: number }[] = [];
  const allResults: { recordId: string; version: number; updatedAt: string }[] = [];

  for (let i = 0; i < dedupedOutbox.length; i += MAX_BATCH_SIZE) {
    const batch = dedupedOutbox.slice(i, i + MAX_BATCH_SIZE);
    const result = await pushOperations(batch);
    allPushed += result.pushed;
    allConflicts.push(...result.conflicts);
    if (result.results) allResults.push(...result.results);

    if (!result.success) {
      return { success: false, pushed: allPushed, conflicts: allConflicts, results: allResults };
    }
  }

  clearOutbox();
  return { success: true, pushed: allPushed, conflicts: allConflicts, results: allResults };
}

export async function syncPull(
  onProgress?: (records: number, hasMore: boolean) => void
): Promise<PullResult> {
  let cursor: string | undefined;
  let totalRecords = 0;
  let hasMore = true;
  const allRecords: PullResult['records'] = [];

  while (hasMore) {
    const result = await pullRecords(cursor);
    if (!result.success) {
      return { ...result, error: result.error };
    }

    allRecords.push(...result.records);

    // Best-effort broadcasting for legacy listeners.
    for (const record of result.records) {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('vault-sync');
        channel.postMessage({ type: 'RECORD_RECEIVED', record });
        channel.close();
      }
    }

    totalRecords += result.records.length;
    hasMore = result.hasMore;
    cursor = result.nextCursor || undefined;

    onProgress?.(totalRecords, hasMore);
  }

  return {
    success: true,
    records: allRecords,
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
