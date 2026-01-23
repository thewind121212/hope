import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

type VaultRow = {
  id: string;
  enabled_at: string;
  device_fingerprint: string | null;
  wrapped_key: string | Buffer | null;
  salt: string | Buffer | null;
  kdf_params: unknown;
};

export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<VaultRow>(
    'SELECT id, enabled_at, device_fingerprint, wrapped_key, salt, kdf_params FROM vaults WHERE user_id = $1',
    [userId]
  );

  if (result.length === 0) {
    return NextResponse.json({ enabled: false });
  }

  const row = result[0];
  
  // Return full envelope data for client-side decryption
  // IMPORTANT: wrapped_key and salt are stored as BYTEA in Postgres.
  // The driver returns them as Node.js Buffer objects.
  // We must convert them to base64 strings before JSON serialization,
  // otherwise they serialize as {"type":"Buffer","data":[...]} which breaks the client.
  return NextResponse.json({
    enabled: true,
    vault: {
      id: row.id,
      enabledAt: row.enabled_at,
      deviceFingerprint: row.device_fingerprint,
    },
    // Envelope for unlocking vault on any device
    envelope: row.wrapped_key ? {
      wrappedKey: Buffer.isBuffer(row.wrapped_key) 
        ? row.wrapped_key.toString('base64') 
        : row.wrapped_key,
      salt: Buffer.isBuffer(row.salt) 
        ? row.salt.toString('base64') 
        : row.salt,
      kdfParams: typeof row.kdf_params === 'string' 
        ? JSON.parse(row.kdf_params) 
        : row.kdf_params,
    } : null,
  });
}
