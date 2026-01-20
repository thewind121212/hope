import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import type { RecordType } from '@/lib/types';

interface EncryptedPushOperation {
  recordId: string;
  recordType?: RecordType; // Optional for backward compatibility, defaults to 'bookmark'
  baseVersion: number;
  ciphertext: string;
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
    const { operations } = body as { operations: EncryptedPushOperation[] };

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (operations.length > 100) {
      return NextResponse.json({ error: 'Too many operations' }, { status: 400 });
    }

    const results: { recordId: string; version: number }[] = [];
    const conflicts: { recordId: string; recordType: RecordType; serverVersion: number; serverCiphertext: string }[] = [];

    for (const op of operations) {
      const { recordId, recordType = 'bookmark', baseVersion, ciphertext, deleted } = op;

      const existing = await query(
        `SELECT id, version, ciphertext 
         FROM records 
         WHERE record_id = $1 AND user_id = $2 AND record_type = $3`,
        [recordId, userId, recordType]
      );

      if (existing.length === 0) {
        await query(
          `INSERT INTO records (user_id, record_id, record_type, ciphertext, encrypted, version, deleted)
           VALUES ($1, $2, $3, $4, true, 1, $5)
           RETURNING id, version`,
          [userId, recordId, recordType, ciphertext, deleted]
        );
        results.push({ recordId, version: 1 });
      } else if (existing[0].version === baseVersion) {
        const updated = await query(
          `UPDATE records
           SET ciphertext = $1, version = version + 1, deleted = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING version`,
          [ciphertext, deleted, existing[0].id]
        );
        results.push({ recordId, version: updated[0].version });
      } else {
        conflicts.push({
          recordId,
          recordType,
          serverVersion: existing[0].version,
          serverCiphertext: existing[0].ciphertext?.toString('base64') || '',
        });
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, results, conflicts },
        { status: 409 }
      );
    }

    // Update last_sync_at in sync_settings
    await query(
      `UPDATE sync_settings SET last_sync_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({ success: true, results, synced: results.length });
  } catch (error) {
    console.error('Sync push error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
