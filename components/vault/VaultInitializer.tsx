"use client";

/**
 * VaultInitializer
 * 
 * Initializes the vault store with the current user ID.
 * - On sign-in: loads the user's vault envelope from server ONLY if syncMode='e2e'
 * - Falls back to localStorage if server fetch fails
 * - On sign-out: clears session state (but keeps envelope in localStorage)
 * - On browser close: sessionStorage clears automatically (vault locks)
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useVaultStore, fetchEnvelopeFromServer } from '@/stores/vault-store';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';

export function VaultInitializer({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const initialize = useVaultStore((s) => s.initialize);
  const clearSession = useVaultStore((s) => s.clearSession);
  const currentUserId = useVaultStore((s) => s.currentUserId);
  const { syncMode } = useSyncSettingsStore();
  
  // Track previous sign-in state to detect sign-out
  const wasSignedIn = useRef<boolean | null>(null);
  
  // Track if we're currently fetching from server
  const [isFetching, setIsFetching] = useState(false);
  const fetchAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const userId = isSignedIn && user ? user.id : null;

    // Detect sign-out: was signed in, now not signed in
    if (wasSignedIn.current === true && !isSignedIn) {
      clearSession();
      fetchAttempted.current = null;
    } 
    // Initialize with current user (or null if not signed in)
    else if (userId !== currentUserId) {
      // First, do synchronous initialization (loads from localStorage)
      initialize(userId);
      
      // Then, if signed in AND syncMode is 'e2e', fetch envelope from server (async)
      // This avoids unnecessary /api/vault calls when user is in plaintext mode
      if (userId && syncMode === 'e2e' && fetchAttempted.current !== userId) {
        fetchAttempted.current = userId;
        setIsFetching(true);
        
        fetchEnvelopeFromServer(userId)
          .catch((error) => {
            console.error('[VaultInitializer] Failed to fetch envelope from server:', error);
          })
          .finally(() => {
            setIsFetching(false);
          });
      }
    }

    // Update ref for next render
    wasSignedIn.current = isSignedIn;
  }, [isLoaded, isSignedIn, user, initialize, clearSession, currentUserId, syncMode]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (syncMode !== 'e2e') return;
    if (fetchAttempted.current === user.id) return;

    fetchAttempted.current = user.id;
    setIsFetching(true);

    fetchEnvelopeFromServer(user.id)
      .catch((error) => {
        console.error('[VaultInitializer] Failed to fetch envelope from server:', error);
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [isLoaded, isSignedIn, user, syncMode]);

  // Don't block rendering while fetching - the UI will update when envelope arrives
  return <>{children}</>;
}
