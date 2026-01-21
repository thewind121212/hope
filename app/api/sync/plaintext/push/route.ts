import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { calculateChecksum } from '@/lib/checksum';
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

    const results: { recordId: string; version: number; updatedAt: string }[] = [];

    for (const op of operations) {
      const { recordId, recordType, data, baseVersion: _baseVersion, deleted } = op;

      // Check for existing record
      const existing = await query(
        `SELECT id, version, data
         FROM records
         WHERE record_id = $1 AND user_id = $2 AND record_type = $3`,
        [recordId, userId, recordType]
      );

      if (existing.length === 0) {
        // Insert new record
        const inserted = await query(
          `INSERT INTO records (user_id, record_id, record_type, data, encrypted, version, deleted)
           VALUES ($1, $2, $3, $4, false, 1, $5)
           RETURNING id, version, updated_at`,
          [userId, recordId, recordType, JSON.stringify(data), deleted]
        );
        results.push({ recordId, version: inserted[0].version, updatedAt: inserted[0].updated_at });
      } else {
        // Update existing record (last-write-wins by ID)
        const updated = await query(
          `UPDATE records
           SET data = $1, version = version + 1, deleted = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING version, updated_at`,
          [JSON.stringify(data), deleted, existing[0].id]
        );
        results.push({ recordId, version: updated[0].version, updatedAt: updated[0].updated_at });
      }
    }

    // Update last_sync_at in sync_settings and recalculate checksum
    await query(
      `UPDATE sync_settings SET last_sync_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    // Recalculate checksum after successful push
    const allRecords = await query(
      `SELECT record_id, record_type, data, version, updated_at
       FROM records
       WHERE user_id = $1 AND encrypted = false AND deleted = false
       ORDER BY record_id ASC`,
      [userId]
    );

    const plaintextRecords = allRecords.map((r) => ({
      recordId: r.record_id,
      recordType: r.record_type,
      data: r.data,
      version: r.version,
      deleted: r.deleted,
      updatedAt: r.updated_at,
    }));

    const newChecksum = calculateChecksum(plaintextRecords);
    const count = allRecords.length;
    const lastUpdate = allRecords.length > 0
      ? allRecords.reduce((latest, r) => {
          const rDate = new Date(r.updated_at);
          return rDate > latest ? rDate : latest;
        }, new Date(0))
      : null;

    return NextResponse.json({
      success: true,
      results,
      synced: results.length,
      checksum: newChecksum,
      checksumMeta: {
        count,
        lastUpdate: lastUpdate?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Plaintext sync push error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
