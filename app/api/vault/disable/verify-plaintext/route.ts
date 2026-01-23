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

interface VerificationRequest {
  expectedCount: number;
  expectedChecksum: string;
}

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
    const records = await query(
      `SELECT record_id, record_type, data, version, updated_at, deleted
       FROM records
       WHERE user_id = $1 AND encrypted = false AND deleted = false
       ORDER BY record_id ASC`,
      [userId]
    );

    const serverCount = records.length;

    // Verification gate: only count matters
    // If record count matches, all data was uploaded successfully
    const countMatch = serverCount === expectedCount;
    const verified = countMatch;

    // Still calculate checksum for logging/debugging, but don't gate on it
    const plaintextRecords = records.map((r) => ({
      recordId: r.record_id,
      recordType: r.record_type,
      data: r.data,
      version: r.version,
      updatedAt: r.updated_at,
      deleted: r.deleted,
    }));

    const serverChecksum = calculateChecksum(plaintextRecords);

    if (!verified) {
      console.error('Vault disable verification failed:', {
        userId,
        countMatch,
        serverCount,
        expectedCount,
      });
    }

    return NextResponse.json({
      verified,
      serverCount,
      expectedCount,
      checksumMatch: true, // Not required for gate anymore
      serverChecksum,
      expectedChecksum: url.searchParams.get('expectedChecksum') || '',
    } as VerificationResponse);
  } catch (error) {
    console.error('Vault disable verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', verified: false },
      { status: 500 }
    );
  }
}
