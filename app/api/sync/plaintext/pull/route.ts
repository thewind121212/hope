import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import type { PlaintextRecord, RecordType } from '@/lib/types';

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const recordType = searchParams.get('recordType') as RecordType | null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

  try {
    let queryText = `
      SELECT record_id, record_type, data, version, deleted, updated_at
      FROM records
      WHERE user_id = $1 AND encrypted = false
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    // Filter by record type if specified
    if (recordType && ['bookmark', 'space', 'pinned-view'].includes(recordType)) {
      queryText += ` AND record_type = $${paramIndex}`;
      params.push(recordType);
      paramIndex++;
    }

    // Cursor-based pagination. Cursor is composite (updated_at, record_id)
    // so records sharing the same timestamp are not skipped between pages.
    let cursorTs: string | null = null;
    let cursorRecordId: string | null = null;
    if (cursor) {
      const sep = cursor.indexOf('|');
      if (sep >= 0) {
        cursorTs = cursor.slice(0, sep);
        cursorRecordId = cursor.slice(sep + 1);
      } else {
        // Legacy callers that only pass a timestamp continue to work.
        cursorTs = cursor;
      }
    }

    if (cursorTs !== null) {
      if (cursorRecordId !== null) {
        queryText += ` AND (updated_at, record_id) > ($${paramIndex}, $${paramIndex + 1})`;
        params.push(cursorTs);
        params.push(cursorRecordId);
        paramIndex += 2;
      } else {
        queryText += ` AND updated_at > $${paramIndex}`;
        params.push(cursorTs);
        paramIndex++;
      }
    }

    queryText += ` ORDER BY updated_at ASC, record_id ASC LIMIT $${paramIndex}`;
    params.push(limit);

    type PlaintextRecordRow = {
      record_id: string;
      record_type: RecordType;
      data: PlaintextRecord['data'];
      version: number;
      deleted: boolean;
      updated_at: string;
    };

    const records = await query<PlaintextRecordRow>(queryText, params);

    const nextCursor = records.length > 0
      ? `${records[records.length - 1].updated_at}|${records[records.length - 1].record_id}`
      : null;

    const hasMore = records.length === limit;

    return NextResponse.json({
      records: records.map((r) => ({
        recordId: r.record_id,
        recordType: r.record_type,
        data: r.data,
        version: r.version,
        deleted: r.deleted,
        updatedAt: r.updated_at,
      })),
      nextCursor,
      hasMore,
    }, { headers });
  } catch (error) {
    console.error('Plaintext sync pull error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
