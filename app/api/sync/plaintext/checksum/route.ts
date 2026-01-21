import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { calculateChecksum } from '@/lib/checksum';

/**
 * GET /api/sync/plaintext/checksum
 *
 * Returns checksum metadata for user's plaintext records.
 * Used by client to determine if a full pull is needed.
 *
 * Response includes:
 * - checksum: Hash of all records
 * - count: Total record count (additional verification)
 * - lastUpdate: Most recent record update timestamp
 * - perTypeCounts: Breakdown by record type
 */
export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Set cache-busting headers
  const headers = new Headers();
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  try {
    // Fetch all non-encrypted, non-deleted records for user
    const records = await query(
      `SELECT record_id, record_type, data, version, updated_at
       FROM records
       WHERE user_id = $1 AND encrypted = false AND deleted = false
       ORDER BY record_id ASC`,
      [userId]
    );

    // Convert to PlaintextRecord format for checksum calculation
    const plaintextRecords = records.map((r) => ({
      recordId: r.record_id,
      recordType: r.record_type,
      data: r.data,
      version: r.version,
      deleted: r.deleted,
      updatedAt: r.updated_at,
    }));

    // Calculate checksum
    const checksum = calculateChecksum(plaintextRecords);

    // Get metadata for additional verification
    const count = records.length;
    const lastUpdate = records.length > 0
      ? records.reduce((latest, r) => {
          const rDate = new Date(r.updated_at);
          return rDate > latest ? rDate : latest;
        }, new Date(0))
      : null;

    // Per-type counts
    const bookmarksCount = records.filter((r) => r.record_type === 'bookmark').length;
    const spacesCount = records.filter((r) => r.record_type === 'space').length;
    const pinnedViewsCount = records.filter((r) => r.record_type === 'pinned-view').length;

    // DEBUG: Log server-side hash calculation details (after lastUpdate is calculated)
    console.log('🔴 SERVER CHECKSUM DEBUG:');
    console.log('  Records count:', plaintextRecords.length);
    console.log('  Records (JSON):', JSON.stringify(plaintextRecords, null, 2));
    console.log('  Calculated checksum:', checksum);
    console.log('  lastUpdate:', lastUpdate?.toISOString() ?? null);
    console.log('---');

    return NextResponse.json({
      checksum,
      count,
      lastUpdate: lastUpdate?.toISOString() ?? null,
      perTypeCounts: {
        bookmarks: bookmarksCount,
        spaces: spacesCount,
        pinnedViews: pinnedViewsCount,
      },
    }, { headers });
  } catch (error) {
    console.error('Checksum fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch checksum' }, { status: 500 });
  }
}
