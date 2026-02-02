import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { calculateChecksum } from '@/lib/checksum';
import type { Bookmark, PlaintextRecord, RecordType } from '@/lib/types';

interface PlaintextBatchRecord {
  recordId: string;
  data: Bookmark;
}

interface EncryptedBatchRecord {
  recordId: string;
  ciphertext: string;
}

interface BatchRequest {
  mode: 'plaintext' | 'e2e';
  records: PlaintextBatchRecord[] | EncryptedBatchRecord[];
}

export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as BatchRequest;
    const { mode, records } = body;

    if (!mode || !['plaintext', 'e2e'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid records' }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        results: [],
      });
    }

    if (records.length > 100) {
      return NextResponse.json({ error: 'Too many records (max 100)' }, { status: 400 });
    }

    const results: { recordId: string; version: number; updatedAt: string }[] = [];
    const recordType: RecordType = 'bookmark';

    if (mode === 'plaintext') {
      // Plaintext mode: batch upsert with data
      for (const record of records as PlaintextBatchRecord[]) {
        const { recordId, data } = record;

        type UpsertedRow = {
          version: number;
          updated_at: string;
        };

        const upserted = await query<UpsertedRow>(
          `INSERT INTO records (user_id, record_id, record_type, data, encrypted, ciphertext, version, deleted)
           VALUES ($1, $2, $3, $4, false, NULL, 1, false)
           ON CONFLICT (user_id, record_id, record_type) DO UPDATE SET
             data = $4,
             encrypted = false,
             ciphertext = NULL,
             version = records.version + 1,
             deleted = false,
             updated_at = NOW()
           RETURNING version, updated_at`,
          [userId, recordId, recordType, JSON.stringify(data)]
        );

        if (upserted.length > 0) {
          results.push({
            recordId,
            version: upserted[0].version,
            updatedAt: upserted[0].updated_at,
          });
        }
      }

      // Update last_sync_at in sync_settings
      await query(
        `UPDATE sync_settings SET last_sync_at = NOW() WHERE user_id = $1`,
        [userId]
      );

      // Recalculate checksum after batch update
      type PlaintextRecordRow = {
        record_id: string;
        record_type: RecordType;
        data: PlaintextRecord['data'];
        version: number;
        updated_at: string;
      };

      const allRecords = await query<PlaintextRecordRow>(
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
        deleted: false,
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
        synced: results.length,
        results,
        checksum: newChecksum,
        checksumMeta: {
          count,
          lastUpdate: lastUpdate?.toISOString() ?? null,
        },
      });
    } else {
      // E2E mode: batch upsert with ciphertext
      for (const record of records as EncryptedBatchRecord[]) {
        const { recordId, ciphertext } = record;

        type ExistingRow = { id: string; version: number };
        type InsertedRow = { id: string; version: number };
        type UpdatedRow = { version: number };

        const existing = await query<ExistingRow>(
          `SELECT id, version
           FROM records
           WHERE record_id = $1 AND user_id = $2 AND record_type = $3`,
          [recordId, userId, recordType]
        );

        if (existing.length === 0) {
          // Insert new record
          const inserted = await query<InsertedRow>(
            `INSERT INTO records (user_id, record_id, record_type, ciphertext, encrypted, data, version, deleted)
             VALUES ($1, $2, $3, $4, true, NULL, 1, false)
             RETURNING id, version`,
            [userId, recordId, recordType, ciphertext]
          );
          results.push({
            recordId,
            version: inserted[0].version,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Update existing record (last-write-wins)
          const updated = await query<UpdatedRow>(
            `UPDATE records
             SET ciphertext = $1, encrypted = true, data = NULL, version = version + 1, deleted = false, updated_at = NOW()
             WHERE id = $2
             RETURNING version`,
            [ciphertext, existing[0].id]
          );
          results.push({
            recordId,
            version: updated[0].version,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update last_sync_at in sync_settings
      await query(
        `UPDATE sync_settings SET last_sync_at = NOW() WHERE user_id = $1`,
        [userId]
      );

      return NextResponse.json({
        success: true,
        synced: results.length,
        results,
      });
    }
  } catch (error) {
    console.error('Tag batch sync error:', {
      error,
      userId,
    });
    return NextResponse.json({ error: 'Batch sync failed' }, { status: 500 });
  }
}
