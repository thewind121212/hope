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
    const { wrappedKey, salt, kdfParams } = body;

    if (!wrappedKey || !salt || !kdfParams) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // IMPORTANT: wrappedKey and salt arrive as base64 strings from the client.
    // We must decode them to binary (Buffer) before storing in Postgres BYTEA columns.
    // Otherwise, Postgres stores the UTF-8 bytes of the base64 string, causing double-encoding.
    const wrappedKeyBinary = Buffer.from(wrappedKey, 'base64');
    const saltBinary = Buffer.from(salt, 'base64');

    const result = await query(
      `INSERT INTO vaults (user_id, wrapped_key, salt, kdf_params)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         wrapped_key = EXCLUDED.wrapped_key,
         salt = EXCLUDED.salt,
         kdf_params = EXCLUDED.kdf_params,
         updated_at = NOW()
       RETURNING id`,
      [userId, wrappedKeyBinary, saltBinary, JSON.stringify(kdfParams)]
    );

    return NextResponse.json({
      success: true,
      vaultId: result[0].id,
    });
  } catch (error) {
    console.error('Vault enable error:', error);
    return NextResponse.json({ error: 'Failed to enable vault' }, { status: 500 });
  }
}
