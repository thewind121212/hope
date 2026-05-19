/**
 * Secure Auth Cleanup
 *
 * Handles secure clearing of all vault and bookmark data from localStorage
 * and sessionStorage when users logout or disable vault.
 *
 * This is CRITICAL for security:
 * - Must be synchronous to prevent race conditions
 * - Must complete before any redirects
 * - Must clear ALL vault-related keys
 * - Should be called BEFORE auth signout
 */

/**
 * Clears all bookmark vault data from browser storage.
 * This is synchronous and must complete before any redirects.
 *
 * Clears:
 * - All localStorage keys starting with "bookmark-vault-"
 * - All localStorage keys related to vault (envelope, etc)
 * - All sessionStorage (vault key is stored here)
 * - In-memory caches (bookmarks, spaces, views)
 *
 * @returns void
 */
export function clearAllVaultData(): void {
  if (typeof window === 'undefined') {
    console.log('[auth-cleanup] Skipping clearAllVaultData (SSR)');
    return;
  }

  try {
    // Step 1: Invalidate all in-memory caches first
    invalidateAllMemoryCaches();

    // Step 2: Collect all localStorage keys to delete
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Delete any bookmark-vault-* key
      if (key.startsWith('bookmark-vault-')) {
        keysToDelete.push(key);
      }
      // Delete vault envelope keys (vault-envelope-*)
      else if (key.startsWith('vault-envelope-')) {
        keysToDelete.push(key);
      }
      // Delete other vault-related keys
      else if (
        key === 'vault-storage' ||
        key === 'vault-session' ||
        key === 'vault-backup-' ||
        key.startsWith('vault-backup-')
      ) {
        keysToDelete.push(key);
      }
      // Sync settings cache (server is source of truth on next login)
      else if (key === 'sync-settings-storage') {
        keysToDelete.push(key);
      }
    }

    // Step 3: Delete all collected localStorage keys
    keysToDelete.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error(`[auth-cleanup] Failed to remove localStorage key "${key}":`, err);
      }
    });

    // Step 4: Clear entire sessionStorage (vault key is in there)
    try {
      sessionStorage.clear();
    } catch (err) {
      console.error('[auth-cleanup] Failed to clear sessionStorage:', err);
    }

    // Step 5: Verify keys are actually cleared (double-check)
    const stillPresent: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('bookmark-vault-') || key?.startsWith('vault-envelope-')) {
        stillPresent.push(key);
      }
    }

    if (stillPresent.length > 0) {
      console.error(
        '[auth-cleanup] WARNING: Failed to clear some localStorage keys:',
        stillPresent
      );
    } else {
      console.log('[auth-cleanup] Successfully cleared all vault data from storage');
    }
  } catch (error) {
    console.error('[auth-cleanup] Unexpected error during clearAllVaultData:', error);
    // Continue execution - we tried our best to clean up
  }
}

/**
 * Invalidates all in-memory caches used by the app.
 * These are populated by storage modules and must be cleared
 * so subsequent reads re-fetch from localStorage (which is now empty).
 */
function invalidateAllMemoryCaches(): void {
  try {
    // Import and invalidate bookmark cache
    import('@/lib/storage').then((m) => {
      if (m.invalidateAllCaches) {
        m.invalidateAllCaches();
      }
    }).catch(() => {
      // Ignore import errors
    });

    // Import and invalidate space cache
    import('@/lib/spacesStorage').then((m) => {
      if (m.invalidateSpaceCache) {
        m.invalidateSpaceCache();
      }
    }).catch(() => {
      // Ignore import errors
    });

    // Import and invalidate pinned views cache
    import('@/lib/pinnedViewsStorage').then((m) => {
      if (m.invalidateViewCache) {
        m.invalidateViewCache();
      }
    }).catch(() => {
      // Ignore import errors
    });
  } catch (error) {
    console.warn('[auth-cleanup] Error invalidating caches:', error);
    // Continue - synchronous cleanup is more important
  }
}

/**
 * Async wrapper for clearAllVaultData with optional delay.
 * Use when you need a small delay to ensure DOM updates complete.
 *
 * @param delayMs Optional delay in milliseconds before returning
 * @returns Promise that resolves after cleanup and optional delay
 */
export async function clearAllVaultDataAsync(delayMs: number = 0): Promise<void> {
  // Do synchronous cleanup immediately
  clearAllVaultData();

  // Then add optional delay if requested
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
