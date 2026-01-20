export interface SyncOperation {
  id: string;
  recordId: string;
  baseVersion: number;
  ciphertext: string;
  deleted: boolean;
  createdAt: number;
  retries: number;
}

const OUTBOX_KEY = 'vault-sync-outbox';

export function getOutbox(): SyncOperation[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OUTBOX_KEY);
  return data ? JSON.parse(data) : [];
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
