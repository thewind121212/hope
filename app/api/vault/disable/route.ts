import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

/**
 * POST /api/vault/disable
 * 
 * Disables the vault for the user and converts all encrypted records to plaintext.
 * This is a multi-step process:
 * 1. Mark vault as disabled (but don't delete yet)
 * 2. Delete all encrypted records (after client has re-uploaded as plaintext)
 * 3. Delete the vault itself
 */
export async function POST(req: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'verify': {
        // Just verify the vault exists
        const vault = await query(
          'SELECT id FROM vaults WHERE user_id = $1',
          [userId]
        );
        
        if (vault.length === 0) {
          return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
        }

        // Get count of encrypted records
        const countResult = await query(
          'SELECT COUNT(*) as count FROM records WHERE user_id = $1 AND encrypted = true',
          [userId]
        );

        return NextResponse.json({
          success: true,
          vaultId: vault[0].id,
          encryptedRecordCount: parseInt(countResult[0].count),
        });
      }

      case 'delete-encrypted': {
        // Delete all encrypted records (client has already re-uploaded as plaintext)
        const result = await query(
          'DELETE FROM records WHERE user_id = $1 AND encrypted = true RETURNING id',
          [userId]
        );

        return NextResponse.json({
          success: true,
          deletedCount: result.length,
        });
      }

      case 'delete-vault': {
        // Delete the vault itself
        const result = await query(
          'DELETE FROM vaults WHERE user_id = $1 RETURNING id',
          [userId]
        );

        if (result.length === 0) {
          return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
        }

        // Update sync settings to plaintext mode
        await query(
          `UPDATE sync_settings 
           SET sync_mode = 'plaintext', updated_at = NOW() 
           WHERE user_id = $1`,
          [userId]
        );

        return NextResponse.json({
          success: true,
          message: 'Vault disabled successfully',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Vault disable error:', error);
    return NextResponse.json({ error: 'Failed to disable vault' }, { status: 500 });
  }
}
