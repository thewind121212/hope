import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.version || !body.vault || !body.records) {
      return NextResponse.json({ error: 'Invalid import format' }, { status: 400 });
    }

    if (body.version !== 1) {
      return NextResponse.json({ error: 'Unsupported version' }, { status: 400 });
    }

    const vaultResult = await query(
      'SELECT id FROM vaults WHERE user_id = $1',
      [userId]
    );

    if (vaultResult.length === 0) {
      return NextResponse.json({ error: 'Vault not enabled on this device' }, { status: 400 });
    }

    const importMode = body.importMode || 'merge';

    const existingRecords = await query(
      'SELECT record_id, version FROM records WHERE user_id = $1',
      [userId]
    );

    const existingMap = new Map(existingRecords.map((r: { record_id: string; version: number }) => [r.record_id, r]));

    let imported = 0;
    let skipped = 0;
    const conflicts: { recordId: string }[] = [];

    for (const record of body.records) {
      const existing = existingMap.get(record.recordId);

      if (!existing) {
        await query(
          `INSERT INTO records (user_id, record_id, ciphertext, version, deleted, updated_at)
           VALUES ($1, $2, $3, $4, false, $5)`,
          [userId, record.recordId, record.ciphertext, record.version, record.updatedAt]
        );
        imported++;
      } else if (importMode === 'replace') {
        if (record.version > existing.version) {
          await query(
            `UPDATE records
             SET ciphertext = $1, version = $2, updated_at = $3
             WHERE record_id = $4`,
            [record.ciphertext, record.version, record.updatedAt, record.recordId]
          );
          imported++;
        } else {
          skipped++;
        }
      } else {
        if (record.version > existing.version) {
          await query(
            `UPDATE records
             SET ciphertext = $1, version = $2, updated_at = $3
             WHERE record_id = $4`,
            [record.ciphertext, record.version, record.updatedAt, record.recordId]
          );
          imported++;
        } else if (record.version === existing.version && importMode === 'keep-both') {
          const newRecordId = `${record.recordId}-${Date.now()}`;
          await query(
            `INSERT INTO records (user_id, record_id, ciphertext, version, deleted, updated_at)
             VALUES ($1, $2, $3, $4, false, $5)`,
            [userId, newRecordId, record.ciphertext, record.version, record.updatedAt]
          );
          imported++;
        } else {
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    });
  } catch (error) {
    console.error('Vault import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
