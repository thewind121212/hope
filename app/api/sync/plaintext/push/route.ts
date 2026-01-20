import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import type { RecordType } from '@/lib/types';

interface PlaintextPushOperation {
  recordId: string;
  recordType: RecordType;
  data: unknown;
  baseVersion: number;
  deleted: boolean;
}

export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { operations } = body as { operations: PlaintextPushOperation[] };

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (operations.length > 100) {
      return NextResponse.json({ error: 'Too many operations (max 100)' }, { status: 400 });
    }

    // Validate record types
    const validTypes: RecordType[] = ['bookmark', 'space', 'pinned-view'];
    for (const op of operations) {
      if (!validTypes.includes(op.recordType)) {
        return NextResponse.json(
          { error: `Invalid record type: ${op.recordType}` },
          { status: 400 }
        );
      }
    }

    const results: { recordId: string; version: number }[] = [];

    for (const op of operations) {
      const { recordId, recordType, data, baseVersion, deleted } = op;

      // Check for existing record
      const existing = await query(
        `SELECT id, version, data 
         FROM records 
         WHERE record_id = $1 AND user_id = $2 AND record_type = $3`,
        [recordId, userId, recordType]
      );

      if (existing.length === 0) {
        // Insert new record
        await query(
          `INSERT INTO records (user_id, record_id, record_type, data, encrypted, version, deleted)
           VALUES ($1, $2, $3, $4, false, 1, $5)
           RETURNING id, version`,
          [userId, recordId, recordType, JSON.stringify(data), deleted]
        );
        results.push({ recordId, version: 1 });
      } else {
        // Update existing record (last-write-wins by ID)
        const updated = await query(
          `UPDATE records
           SET data = $1, version = version + 1, deleted = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING version`,
          [JSON.stringify(data), deleted, existing[0].id]
        );
        results.push({ recordId, version: updated[0].version });
      }
    }

    // Update last_sync_at in sync_settings
    await query(
      `UPDATE sync_settings SET last_sync_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({ 
      success: true, 
      results,
      synced: results.length,
    });
  } catch (error) {
    console.error('Plaintext sync push error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
