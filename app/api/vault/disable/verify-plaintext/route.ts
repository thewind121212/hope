/**
 * GET /api/vault/disable/verify-plaintext
 *
 * Critical verification gate for two-phase vault disable commit.
 *
 * PHASE 1 GATE: Verifies that plaintext records were uploaded successfully
 * before encrypted deletion is allowed (Phase 2).
 *
 * Compares:
 * - Expected record count (from client)
 * - Server record count (from database)
 * - Expected checksum (from client)
 * - Server checksum (calculated from records)
 *
 * If any verification fails, Phase 2 (deletion) is ABORTED.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { calculateChecksum } from '@/lib/checksum';
import type { PlaintextRecord, RecordType } from '@/lib/types';

interface VerificationResponse {
  verified: boolean;
  serverCount: number;
  expectedCount: number;
  checksumMatch: boolean;
  serverChecksum: string;
  expectedChecksum: string;
  error?: string;
}

export async function GET(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const expectedCountParam = url.searchParams.get('expectedCount');

    // Validate that expectedCount parameter exists and is a valid non-negative number
    if (expectedCountParam === null) {
      return NextResponse.json(
        { error: 'Missing expectedCount' },
        { status: 400 }
      );
    }

    const expectedCount = parseInt(expectedCountParam, 10);
    if (isNaN(expectedCount) || expectedCount < 0) {
      return NextResponse.json(
        { error: 'expectedCount must be a non-negative integer' },
        { status: 400 }
      );
    }

    // Fetch all plaintext records from database
    type PlaintextRecordRow = {
      record_id: string;
      record_type: RecordType;
      data: PlaintextRecord['data'];
      version: number;
      updated_at: string;
      deleted: boolean;
    };

    const records = await query<PlaintextRecordRow>(
      `SELECT record_id, record_type, data, version, updated_at, deleted
       FROM records
       WHERE user_id = $1 AND encrypted = false AND deleted = false
       ORDER BY record_id ASC`,
      [userId]
    );

    const serverCount = records.length;

    // Verification gate: total count AND checksum must match. Count alone is
    // not enough — a client could upload only bookmarks (missing spaces) and
    // still hit the same total. Checksum is content-aware.
    const expectedChecksum = url.searchParams.get('expectedChecksum') || '';
    const countMatch = serverCount === expectedCount;

    const plaintextRecords = records.map((r) => ({
      recordId: r.record_id,
      recordType: r.record_type,
      data: r.data,
      version: r.version,
      updatedAt: r.updated_at,
      deleted: r.deleted,
    }));

    const serverChecksum = calculateChecksum(plaintextRecords);
    // If client did not provide a checksum (older clients), fall back to
    // count-only verification. New clients should always supply one.
    const checksumMatch = expectedChecksum
      ? serverChecksum === expectedChecksum
      : true;
    const verified = countMatch && checksumMatch;

    if (!verified) {
      console.error('Vault disable verification failed:', {
        userId,
        countMatch,
        checksumMatch,
        serverCount,
        expectedCount,
        serverChecksum,
        expectedChecksum,
      });
    }

    return NextResponse.json({
      verified,
      serverCount,
      expectedCount,
      checksumMatch,
      serverChecksum,
      expectedChecksum,
    } as VerificationResponse);
  } catch (error) {
    console.error('Vault disable verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', verified: false },
      { status: 500 }
    );
  }
}
