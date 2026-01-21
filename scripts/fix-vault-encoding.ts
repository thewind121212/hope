/**
 * Migration script to fix double-encoded vault envelope data.
 * 
 * The Problem:
 * - Client sends wrappedKey and salt as base64 strings
 * - Server was storing these strings directly into BYTEA columns
 * - Postgres stored the UTF-8 bytes of the base64 string (not the decoded binary)
 * - When reading, we base64-encode the BYTEA, resulting in double-encoding
 * 
 * The Fix:
 * - Detect double-encoded data by checking if decoding base64 twice is valid
 * - Update the database with correctly-encoded binary data
 * 
 * Usage:
 *   npx tsx scripts/fix-vault-encoding.ts
 * 
 * Options:
 *   --dry-run   Show what would be changed without making changes
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { query } from '../lib/db';

interface VaultRow {
  id: string;
  user_id: string;
  wrapped_key: Buffer;
  salt: Buffer;
}

function isValidBase64(str: string): boolean {
  try {
    // Check if it's valid base64 by attempting to decode
    const decoded = Buffer.from(str, 'base64');
    // Re-encode and compare to check if it's proper base64
    return decoded.toString('base64') === str || 
           // Handle padding variations
           decoded.toString('base64').replace(/=+$/, '') === str.replace(/=+$/, '');
  } catch {
    return false;
  }
}

function isDoubleEncoded(buffer: Buffer): { isDouble: boolean; decoded?: Buffer } {
  try {
    // Convert BYTEA buffer to string (UTF-8)
    const asString = buffer.toString('utf8');
    
    // Check if this string looks like base64
    if (!isValidBase64(asString)) {
      return { isDouble: false };
    }
    
    // Try to decode it as base64
    const decoded = Buffer.from(asString, 'base64');
    
    // Verify the decoded result is reasonable (non-empty, proper length for crypto data)
    // Salt should be 16 bytes, wrappedKey should be 12 (IV) + 32 (key) + 16 (tag) = 60 bytes
    if (decoded.length >= 16 && decoded.length <= 100) {
      return { isDouble: true, decoded };
    }
    
    return { isDouble: false };
  } catch {
    return { isDouble: false };
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('=== Vault Encoding Fix Migration ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');
  
  try {
    // Fetch all vaults
    const vaults = await query<VaultRow>(
      'SELECT id, user_id, wrapped_key, salt FROM vaults'
    );
    
    console.log(`Found ${vaults.length} vault(s) to check\n`);
    
    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const vault of vaults) {
      console.log(`--- Vault ${vault.id} (user: ${vault.user_id.substring(0, 8)}...) ---`);
      
      const wrappedKeyCheck = isDoubleEncoded(vault.wrapped_key);
      const saltCheck = isDoubleEncoded(vault.salt);
      
      console.log(`  wrapped_key: ${vault.wrapped_key.length} bytes, double-encoded: ${wrappedKeyCheck.isDouble}`);
      console.log(`  salt: ${vault.salt.length} bytes, double-encoded: ${saltCheck.isDouble}`);
      
      if (wrappedKeyCheck.isDouble && saltCheck.isDouble) {
        console.log(`  Status: NEEDS FIX`);
        
        if (wrappedKeyCheck.decoded && saltCheck.decoded) {
          console.log(`  New wrapped_key length: ${wrappedKeyCheck.decoded.length} bytes`);
          console.log(`  New salt length: ${saltCheck.decoded.length} bytes`);
          
          if (!isDryRun) {
            try {
              await query(
                'UPDATE vaults SET wrapped_key = $1, salt = $2, updated_at = NOW() WHERE id = $3',
                [wrappedKeyCheck.decoded, saltCheck.decoded, vault.id]
              );
              console.log(`  Result: FIXED`);
              fixed++;
            } catch (err) {
              console.log(`  Result: ERROR - ${err}`);
              errors++;
            }
          } else {
            console.log(`  Result: WOULD FIX (dry run)`);
            fixed++;
          }
        }
      } else if (wrappedKeyCheck.isDouble || saltCheck.isDouble) {
        console.log(`  Status: PARTIAL ISSUE (only one field double-encoded)`);
        console.log(`  Result: SKIPPED (needs manual review)`);
        skipped++;
      } else {
        console.log(`  Status: OK (correctly encoded)`);
        skipped++;
      }
      
      console.log('');
    }
    
    console.log('=== Summary ===');
    console.log(`Total vaults: ${vaults.length}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped (already correct): ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    if (isDryRun && fixed > 0) {
      console.log('\nRun without --dry-run to apply fixes.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
