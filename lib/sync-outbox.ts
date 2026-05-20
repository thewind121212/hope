import type { RecordType } from '@/lib/types';

export interface SyncOperation {
  id: string;
  recordId: string;
  recordType: RecordType;
  baseVersion: number;
  ciphertext: string;
  deleted: boolean;
  createdAt: number;
  retries: number;
}

const OUTBOX_KEY = 'vault-sync-outbox';
const OUTBOX_QUARANTINE_KEY = 'vault-sync-outbox-quarantine';

function normalizeOutboxItem(op: unknown): SyncOperation | null {
  if (!op || typeof op !== 'object') return null;

  const candidate = op as Partial<SyncOperation>;
  const recordId = typeof candidate.recordId === 'string' ? candidate.recordId : null;
  const recordType = typeof candidate.recordType === 'string'
    ? (candidate.recordType as RecordType)
    : 'bookmark';
  const baseVersion = typeof candidate.baseVersion === 'number' ? candidate.baseVersion : 0;
  const ciphertext = typeof candidate.ciphertext === 'string' ? candidate.ciphertext : null;
  const deleted = typeof candidate.deleted === 'boolean' ? candidate.deleted : false;

  const id = typeof candidate.id === 'string'
    ? candidate.id
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now();
  const retries = typeof candidate.retries === 'number' ? candidate.retries : 0;

  if (!recordId || !ciphertext) return null;

  return {
    id,
    recordId,
    recordType,
    baseVersion,
    ciphertext,
    deleted,
    createdAt,
    retries,
  };
}

export function getOutbox(): SyncOperation[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OUTBOX_KEY);
  if (!data) return [];

  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    const normalized: SyncOperation[] = [];
    const quarantined: unknown[] = [];
    for (const item of parsed) {
      const norm = normalizeOutboxItem(item);
      if (norm) normalized.push(norm);
      else quarantined.push(item);
    }

    if (quarantined.length > 0) {
      // Preserve malformed ops in a quarantine bucket instead of silently
      // dropping. Surface count via console so dev can recover them.
      try {
        const existing = localStorage.getItem(OUTBOX_QUARANTINE_KEY);
        const prev = existing ? JSON.parse(existing) : [];
        const combined = Array.isArray(prev)
          ? [...prev, ...quarantined]
          : quarantined;
        localStorage.setItem(OUTBOX_QUARANTINE_KEY, JSON.stringify(combined));
      } catch {
        // Best-effort; do not block.
      }
      console.warn(
        `[sync-outbox] quarantined ${quarantined.length} malformed op(s); see ${OUTBOX_QUARANTINE_KEY}`,
      );
      saveOutbox(normalized);
    }

    return normalized;
  } catch {
    return [];
  }
}

function saveOutbox(outbox: SyncOperation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

export function addToOutbox(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retries'>): SyncOperation {
  const outbox = getOutbox();
  const op: SyncOperation = {
    ...operation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  outbox.push(op);
  saveOutbox(outbox);
  return op;
}

export function removeFromOutbox(id: string): void {
  const outbox = getOutbox();
  const filtered = outbox.filter((op) => op.id !== id);
  saveOutbox(filtered);
}

export function updateOutboxItem(id: string, updates: Partial<SyncOperation>): void {
  const outbox = getOutbox();
  const index = outbox.findIndex((op) => op.id === id);
  if (index !== -1) {
    outbox[index] = { ...outbox[index], ...updates };
    saveOutbox(outbox);
  }
}

export function clearOutbox(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OUTBOX_KEY);
}

export function getOutboxSize(): number {
  return getOutbox().length;
}
