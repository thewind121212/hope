import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export async function GET() {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query(
    'SELECT id, enabled_at, device_fingerprint FROM vaults WHERE user_id = $1',
    [userId]
  );

  if (result.length === 0) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    vault: {
      id: result[0].id,
      enabledAt: result[0].enabled_at,
      deviceFingerprint: result[0].device_fingerprint,
    },
  });
}
