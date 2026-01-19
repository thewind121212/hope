import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { operations } = body;

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (operations.length > 100) {
      return NextResponse.json({ error: 'Too many operations' }, { status: 400 });
    }

    const results = [];
    const conflicts = [];

    for (const op of operations) {
      const { recordId, baseVersion, ciphertext, deleted } = op;

      const existing = await query(
        'SELECT id, version FROM records WHERE record_id = $1 AND user_id = $2',
        [recordId, userId]
      );

      if (existing.length === 0) {
        await query(
          `INSERT INTO records (user_id, record_id, ciphertext, version, deleted)
           VALUES ($1, $2, $3, 1, $4)
           RETURNING id, version`,
          [userId, recordId, ciphertext, deleted]
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
          currentVersion: existing[0].version,
        });
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, conflicts },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Sync push error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
