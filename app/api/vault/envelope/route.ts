import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import type { VaultKeyEnvelope } from '@/lib/types';

type VaultEnvelopeRow = {
  wrapped_key: string | Buffer;
  salt: string | Buffer;
  kdf_params: string | VaultKeyEnvelope['kdfParams'];
  recovery_wrappers: string | VaultKeyEnvelope['recoveryWrappers'] | null;
};

type VaultRow = { id: string };

export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query<VaultEnvelopeRow>(
      `SELECT
        wrapped_key,
        salt,
        kdf_params,
        recovery_wrappers
      FROM vaults WHERE user_id = $1`,
      [userId]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    const row = result[0];

    const envelope: VaultKeyEnvelope = {
      wrappedKey: Buffer.isBuffer(row.wrapped_key)
        ? row.wrapped_key.toString('base64')
        : row.wrapped_key,
      salt: Buffer.isBuffer(row.salt)
        ? row.salt.toString('base64')
        : row.salt,
      kdfParams: typeof row.kdf_params === 'string'
        ? JSON.parse(row.kdf_params)
        : row.kdf_params,
      version: 1,
    };

    if (row.recovery_wrappers) {
      envelope.recoveryWrappers = typeof row.recovery_wrappers === 'string'
        ? JSON.parse(row.recovery_wrappers)
        : row.recovery_wrappers;
    }

    return NextResponse.json({ envelope });
  } catch (error) {
    console.error('GET /api/vault/envelope error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault envelope' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const envelope: VaultKeyEnvelope = await request.json();

    if (!envelope.wrappedKey || !envelope.salt) {
      return NextResponse.json(
        { error: 'Invalid envelope: missing wrappedKey or salt' },
        { status: 400 }
      );
    }

    // Update vault with new envelope (primary key wrapper can change)
    // and recovery wrappers
    const kdfParamsJson = JSON.stringify(envelope.kdfParams);
    const recoveryWrappersJson = envelope.recoveryWrappers
      ? JSON.stringify(envelope.recoveryWrappers)
      : null;

    const result = await query<VaultRow>(
      `UPDATE vaults
       SET wrapped_key = decode($2, 'base64'),
           salt = decode($3, 'base64'),
           kdf_params = $4,
           recovery_wrappers = $5,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING id`,
      [
        userId,
        envelope.wrappedKey,
        envelope.salt,
        kdfParamsJson,
        recoveryWrappersJson,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, envelopeUpdated: true });
  } catch (error) {
    console.error('PUT /api/vault/envelope error:', error);
    return NextResponse.json(
      { error: 'Failed to update vault envelope' },
      { status: 500 }
    );
  }
}
