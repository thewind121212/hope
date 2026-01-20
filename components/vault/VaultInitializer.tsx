"use client";

/**
 * VaultInitializer
 * 
 * Initializes the vault store with the current user ID.
 * - On sign-in: loads the user's vault envelope from localStorage
 * - On sign-out: clears session state (but keeps envelope in localStorage)
 * - On browser close: sessionStorage clears automatically (vault locks)
 */

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useVaultStore } from '@/stores/vault-store';

export function VaultInitializer({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const initialize = useVaultStore((s) => s.initialize);
  const clearSession = useVaultStore((s) => s.clearSession);
  const currentUserId = useVaultStore((s) => s.currentUserId);
  
  // Track previous sign-in state to detect sign-out
  const wasSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const userId = isSignedIn && user ? user.id : null;

    // Detect sign-out: was signed in, now not signed in
    if (wasSignedIn.current === true && !isSignedIn) {
      clearSession();
    } 
    // Initialize with current user (or null if not signed in)
    else if (userId !== currentUserId) {
      initialize(userId);
    }

    // Update ref for next render
    wasSignedIn.current = isSignedIn;
  }, [isLoaded, isSignedIn, user, initialize, clearSession, currentUserId]);

  return <>{children}</>;
}
