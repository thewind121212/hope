import { createHash } from 'crypto';
import type { PlaintextRecord } from './types';

/**
 * Checksum calculation utility for sync optimization.
 *
 * Server-side uses Node.js crypto module.
 * Client-side uses Web Crypto API.
 */

/**
 * Server-side checksum calculation using Node.js crypto.
 * Sorts records by recordId for deterministic hashing.
 *
 * @param records - Array of plaintext records to hash
 * @returns SHA-256 hash as hex string
 */
export function calculateChecksum(records: PlaintextRecord[]): string {
  if (records.length === 0) {
    // Empty data has a consistent hash
    return createHash('sha256').update('[]').digest('hex');
  }

  // Sort by recordId for deterministic ordering
  const sortedRecords = records.slice().sort((a, b) => {
    return a.recordId.localeCompare(b.recordId);
  });

  // Create deterministic string representation
  const dataString = JSON.stringify(sortedRecords, (key, value) => {
    // Sort object keys for consistency
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<{ [key: string]: unknown }>((sorted, k) => {
          sorted[k] = value[k as keyof typeof value];
          return sorted;
        }, {});
    }
    return value;
  });

  // Compute SHA-256 hash (matches client-side)
  return createHash('sha256').update(dataString).digest('hex');
}

/**
 * Client-side checksum calculation using Web Crypto API.
 * Use this in browser contexts where Node.js crypto is unavailable.
 *
 * @param records - Array of plaintext records to hash
 * @returns Promise resolving to SHA-256 hash as hex string
 */
export async function calculateChecksumClient(records: PlaintextRecord[]): Promise<string> {
  if (records.length === 0) {
    const encoder = new TextEncoder();
    const data = encoder.encode('[]');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  }

  // Sort by recordId for deterministic ordering
  const sortedRecords = records.slice().sort((a, b) => {
    return a.recordId.localeCompare(b.recordId);
  });

  // Create deterministic string representation
  const dataString = JSON.stringify(sortedRecords, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<{ [key: string]: unknown }>((sorted, k) => {
          sorted[k] = value[k as keyof typeof value];
          return sorted;
        }, {});
    }
    return value;
  });

  // Compute SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Convert ArrayBuffer to hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate combined checksum for all local data types.
 * This creates a single hash from bookmarks, spaces, and pinned views.
 *
 * @param bookmarks - Array of bookmarks
 * @param spaces - Array of spaces
 * @param pinnedViews - Array of pinned views
 * @returns Promise resolving to SHA-256 hash as hex string
 */
export async function calculateCombinedChecksum(
  bookmarks: unknown[],
  spaces: unknown[],
  pinnedViews: unknown[]
): Promise<string> {
  const now = new Date().toISOString();

  const allRecords = [
    ...bookmarks.map((data) => ({
      recordId: (data as { id: string }).id,
      recordType: 'bookmark' as const,
      data,
      version: (data as { _syncVersion?: number })._syncVersion ?? 0,
      deleted: false,
      updatedAt: (data as { updatedAt?: string }).updatedAt ?? now,
    })),
    ...spaces.map((data) => ({
      recordId: (data as { id: string }).id,
      recordType: 'space' as const,
      data,
      version: (data as { _syncVersion?: number })._syncVersion ?? 0,
      deleted: false,
      updatedAt: (data as { updatedAt?: string }).updatedAt ?? now,
    })),
    ...pinnedViews.map((data) => ({
      recordId: (data as { id: string }).id,
      recordType: 'pinned-view' as const,
      data,
      version: (data as { _syncVersion?: number })._syncVersion ?? 0,
      deleted: false,
      updatedAt: (data as { updatedAt?: string }).updatedAt ?? now,
    })),
  ];

  // DEBUG: Log client-side hash calculation details
  console.log('🟢 CLIENT CHECKSUM DEBUG:');
  console.log('  Bookmarks:', bookmarks.length);
  console.log('  Spaces:', spaces.length);
  console.log('  PinnedViews:', pinnedViews.length);
  console.log('  Records (JSON):', JSON.stringify(allRecords, null, 2));

  const checksum = await calculateChecksumClient(allRecords as PlaintextRecord[]);
  console.log('  Calculated checksum:', checksum);
  console.log('---');

  return checksum;
}
