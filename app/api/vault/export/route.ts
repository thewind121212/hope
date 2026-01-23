import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    type VaultRow = {
      id: string;
      wrapped_key: string | Buffer;
      salt: string | Buffer;
      kdf_params: unknown;
      enabled_at: string;
    };
    type RecordRow = {
      record_id: string;
      ciphertext: string | Buffer;
      version: number;
      deleted: boolean;
      updated_at: string;
    };

    const vaultResult = await query<VaultRow>(
      'SELECT id, wrapped_key, salt, kdf_params, enabled_at FROM vaults WHERE user_id = $1',
      [userId]
    );

    if (vaultResult.length === 0) {
      return NextResponse.json({ error: 'Vault not enabled' }, { status: 400 });
    }

    const vault = vaultResult[0];

    const records = await query<RecordRow>(
      `SELECT record_id, ciphertext, version, deleted, updated_at
       FROM records
       WHERE user_id = $1 AND deleted = false
       ORDER BY updated_at ASC`,
      [userId]
    );

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      vault: {
        id: vault.id,
        enabledAt: vault.enabled_at,
        wrappedKey: vault.wrapped_key,
        salt: vault.salt,
        kdfParams: vault.kdf_params,
      },
      records: records.map((r) => ({
        recordId: r.record_id,
        ciphertext: r.ciphertext,
        version: r.version,
        updatedAt: r.updated_at,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const filename = `bookmarks-vault-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Vault export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
