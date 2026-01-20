import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import type { RecordType } from '@/lib/types';

export async function GET(req: NextRequest) {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const recordType = searchParams.get('recordType') as RecordType | null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

  try {
    let queryText = `
      SELECT record_id, record_type, ciphertext, version, deleted, updated_at
      FROM records
      WHERE user_id = $1 AND encrypted = true
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    // Filter by record type if specified
    if (recordType && ['bookmark', 'space', 'pinned-view'].includes(recordType)) {
      queryText += ` AND record_type = $${paramIndex}`;
      params.push(recordType);
      paramIndex++;
    }

    if (cursor) {
      queryText += ` AND updated_at > $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    queryText += ` ORDER BY updated_at ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const records = await query(queryText, params);

    const nextCursor = records.length > 0
      ? records[records.length - 1].updated_at
      : null;

    const hasMore = records.length === limit;

    return NextResponse.json({
      records: records.map((r) => ({
        recordId: r.record_id,
        recordType: r.record_type || 'bookmark', // Default for backward compatibility
        ciphertext: r.ciphertext?.toString('base64') || null,
        version: r.version,
        deleted: r.deleted,
        updatedAt: r.updated_at,
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
