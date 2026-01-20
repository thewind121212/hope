export interface ConflictRecord {
  local: {
    recordId: string;
    ciphertext: string;
    version: number;
    updatedAt: string;
  };
  remote: {
    ciphertext: string;
    version: number;
    updatedAt: string;
  };
}

export interface ConflictResolution {
  strategy: 'keep-both' | 'local-wins' | 'remote-wins';
  resolvedRecordId?: string;
}

export function detectConflict(
  local: { ciphertext: string; version: number } | null,
  remote: { ciphertext: string; version: number }
): ConflictRecord | null {
  if (!local) return null;
  if (local.version !== remote.version) {
    return {
      local: {
        recordId: '',
        ciphertext: local.ciphertext,
        version: local.version,
        updatedAt: '',
      },
      remote: {
        ciphertext: remote.ciphertext,
        version: remote.version,
        updatedAt: '',
      },
    };
  }
  return null;
}

export function resolveConflict(
  conflict: ConflictRecord,
  strategy: 'keep-both' | 'local-wins' | 'remote-wins',
  baseRecordId: string
): { recordId: string; ciphertext: string; version: number } {
  switch (strategy) {
    case 'local-wins':
      return {
        recordId: baseRecordId,
        ciphertext: conflict.local.ciphertext,
        version: Math.max(conflict.local.version, conflict.remote.version) + 1,
      };
    case 'remote-wins':
      return {
        recordId: baseRecordId,
        ciphertext: conflict.remote.ciphertext,
        version: Math.max(conflict.local.version, conflict.remote.version) + 1,
      };
    case 'keep-both':
      return {
        recordId: `${baseRecordId}-${Date.now()}`,
        ciphertext: conflict.remote.ciphertext,
        version: 1,
      };
    default:
      throw new Error('Unknown conflict resolution strategy');
  }
}

export function getConflictKey(local: ConflictRecord['local'], remote: ConflictRecord['remote']): string {
  return `${local.version}-${remote.version}`;
}
