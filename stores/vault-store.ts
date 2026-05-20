"use client";

import { create } from 'zustand';
import type { VaultKeyEnvelope } from '@/lib/types';

// Storage keys
const ENVELOPE_STORAGE_PREFIX = 'vault-envelope-';
const SESSION_STORAGE_KEY = 'vault-session';
const OLD_VAULT_STORAGE_KEY = 'vault-storage'; // Legacy key to clean up

// Encrypted storage keys to clear when envelope changes
const ENCRYPTED_STORAGE_KEYS = [
  'bookmark-vault-encrypted',
  'bookmark-vault-encrypted-spaces',
  'bookmark-vault-encrypted-pinned-views',
  'bookmark-vault-pulled-ciphertext',
  'vault-sync-outbox',
];

// Helper to get envelope storage key for a user
function getEnvelopeKey(userId: string): string {
  return `${ENVELOPE_STORAGE_PREFIX}${userId}`;
}

// Helper to safely access localStorage
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

// Helper to safely access sessionStorage
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

// Clean up old vault storage format (one-time migration)
function cleanupOldVaultStorage(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  
  // Remove the old global vault-storage key
  if (storage.getItem(OLD_VAULT_STORAGE_KEY)) {
    storage.removeItem(OLD_VAULT_STORAGE_KEY);
    console.log('Cleaned up legacy vault-storage');
  }
}

// Check if two envelopes are the same (by comparing wrappedKey and salt)
function envelopesMatch(a: VaultKeyEnvelope | null, b: VaultKeyEnvelope | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.wrappedKey === b.wrappedKey && a.salt === b.salt;
}

// Clear all encrypted storage caches (call when envelope changes)
function clearEncryptedCaches(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  
  for (const key of ENCRYPTED_STORAGE_KEYS) {
    storage.removeItem(key);
  }
  console.log('[vault-store] Cleared encrypted caches due to envelope change');
}

// Load envelope from localStorage for a specific user
function loadEnvelope(userId: string): VaultKeyEnvelope | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  
  try {
    const data = storage.getItem(getEnvelopeKey(userId));
    if (!data) return null;
    return JSON.parse(data) as VaultKeyEnvelope;
  } catch {
    return null;
  }
}

// Save envelope to localStorage for a specific user
function saveEnvelope(userId: string, envelope: VaultKeyEnvelope): void {
  const storage = getLocalStorage();
  if (!storage) return;
  
  storage.setItem(getEnvelopeKey(userId), JSON.stringify(envelope));
}

// Clear envelope from localStorage for a specific user
function clearEnvelope(userId: string): void {
  const storage = getLocalStorage();
  if (!storage) return;
  
  storage.removeItem(getEnvelopeKey(userId));
}

// Session state stored in sessionStorage (cleared on browser close)
interface SessionState {
  isUnlocked: boolean;
  vaultKey: number[] | null; // Stored as array for JSON serialization
}

// Load session state from sessionStorage
function loadSessionState(): SessionState {
  const storage = getSessionStorage();
  if (!storage) return { isUnlocked: false, vaultKey: null };
  
  try {
    const data = storage.getItem(SESSION_STORAGE_KEY);
    if (!data) return { isUnlocked: false, vaultKey: null };
    return JSON.parse(data) as SessionState;
  } catch {
    return { isUnlocked: false, vaultKey: null };
  }
}

// Save session state to sessionStorage
function saveSessionState(state: SessionState): void {
  const storage = getSessionStorage();
  if (!storage) return;
  
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
}

// Clear session state from sessionStorage
function clearSessionState(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  
  storage.removeItem(SESSION_STORAGE_KEY);
}

interface VaultState {
  // Current user ID (set when user signs in)
  currentUserId: string | null;

  // Session state (stored in sessionStorage)
  isUnlocked: boolean;
  vaultKey: Uint8Array | null;

  // Envelope for current user (loaded from localStorage)
  vaultEnvelope: VaultKeyEnvelope | null;

  // True while a vault enable/disable flow is mid-execution. Used by
  // canSync() to suppress background pulls/pushes that would race against
  // the transition and clobber data.
  transitionInProgress: boolean;

  // Initialize store with user ID (call on sign-in / app load)
  initialize: (userId: string | null) => void;

  // Set envelope for current user (saves to localStorage)
  setEnvelope: (envelope: VaultKeyEnvelope) => void;

  // Update envelope for current user (saves to localStorage and updates state)
  updateEnvelope: (envelope: VaultKeyEnvelope) => void;

  // Clear envelope for current user (removes from localStorage)
  clearEnvelope: () => void;

  // Unlock vault (saves to sessionStorage)
  setUnlocked: (unlocked: boolean, key?: Uint8Array) => void;

  // Lock vault (clears sessionStorage unlock state)
  lock: () => void;

  // Clear all session state (call on sign-out)
  clearSession: () => void;

  // Mark the start/end of a vault mode transition
  setTransitionInProgress: (inProgress: boolean) => void;
}

export const useVaultStore = create<VaultState>()((set, get) => {
  // Load initial session state
  const initialSession = loadSessionState();
  
  // Clean up old storage format on first load
  cleanupOldVaultStorage();
  
  return {
    currentUserId: null,
    isUnlocked: initialSession.isUnlocked,
    vaultKey: initialSession.vaultKey ? new Uint8Array(initialSession.vaultKey) : null,
    vaultEnvelope: null,
    transitionInProgress: false,

    initialize: (userId: string | null) => {
      if (!userId) {
        // No user - clear everything
        set({
          currentUserId: null,
          vaultEnvelope: null,
          isUnlocked: false,
          vaultKey: null,
        });
        clearSessionState();
        return;
      }
      
      // Load envelope for this user
      const envelope = loadEnvelope(userId);
      
      // Load session state
      const session = loadSessionState();
      
      set({
        currentUserId: userId,
        vaultEnvelope: envelope,
        isUnlocked: session.isUnlocked,
        vaultKey: session.vaultKey ? new Uint8Array(session.vaultKey) : null,
      });
    },

    setEnvelope: (envelope: VaultKeyEnvelope) => {
      const { currentUserId } = get();
      if (!currentUserId) {
        console.warn('Cannot set envelope without a current user');
        return;
      }

      saveEnvelope(currentUserId, envelope);
      set({ vaultEnvelope: envelope });
    },

    updateEnvelope: (envelope: VaultKeyEnvelope) => {
      const { currentUserId } = get();
      if (!currentUserId) {
        console.warn('Cannot update envelope without a current user');
        return;
      }

      saveEnvelope(currentUserId, envelope);
      set({ vaultEnvelope: envelope });
    },

    clearEnvelope: () => {
      const { currentUserId } = get();
      if (currentUserId) {
        clearEnvelope(currentUserId);
      }
      set({ vaultEnvelope: null });
    },

    setUnlocked: (unlocked: boolean, key?: Uint8Array) => {
      const vaultKey = key ?? null;
      
      // Save to sessionStorage
      saveSessionState({
        isUnlocked: unlocked,
        vaultKey: vaultKey ? Array.from(vaultKey) : null,
      });
      
      set({
        isUnlocked: unlocked,
        vaultKey,
      });
    },

    lock: () => {
      // Clear session state
      saveSessionState({
        isUnlocked: false,
        vaultKey: null,
      });
      
      set({
        isUnlocked: false,
        vaultKey: null,
      });
    },

    clearSession: () => {
      // Called on sign-out - clear session state but keep envelope in localStorage
      clearSessionState();

      set({
        currentUserId: null,
        vaultEnvelope: null,
        isUnlocked: false,
        vaultKey: null,
        transitionInProgress: false,
      });
    },

    setTransitionInProgress: (inProgress: boolean) => {
      set({ transitionInProgress: inProgress });
    },
  };
});

/**
 * Fetches the vault envelope from the server and updates local state.
 * 
 * This is the source of truth for multi-device support:
 * - Fetches envelope from server
 * - Compares with local envelope
 * - If different, clears stale encrypted caches (they used old key)
 * - Saves server envelope to localStorage
 * - Updates Zustand state
 * 
 * @returns The envelope from server, or null if vault not enabled
 */
export async function fetchEnvelopeFromServer(userId: string): Promise<VaultKeyEnvelope | null> {
  try {
    const response = await fetch('/api/vault');
    if (!response.ok) {
      console.error('[vault-store] Failed to fetch vault from server:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.enabled || !data.envelope) {
      // No vault on server
      return null;
    }

    // Validate envelope format - must be base64 strings, not Buffer objects
    // This protects against server serialization bugs
    if (typeof data.envelope.wrappedKey !== 'string' || typeof data.envelope.salt !== 'string') {
      console.error('[vault-store] Server returned invalid envelope format (expected base64 strings):', {
        wrappedKeyType: typeof data.envelope.wrappedKey,
        saltType: typeof data.envelope.salt,
      });
      return null;
    }

    const serverEnvelope: VaultKeyEnvelope = {
      wrappedKey: data.envelope.wrappedKey,
      salt: data.envelope.salt,
      kdfParams: data.envelope.kdfParams,
      version: 1, // Always 1 for current implementation
    };

    // Compare with local envelope
    const localEnvelope = loadEnvelope(userId);
    
    if (!envelopesMatch(localEnvelope, serverEnvelope)) {
      console.log('[vault-store] Envelope changed, clearing stale encrypted caches');
      // Envelope is different - clear any locally cached encrypted data
      // since it was encrypted with a different key
      clearEncryptedCaches();
      
      // Also lock the vault since the key changed
      clearSessionState();
    }

    // Save server envelope as the new local envelope
    saveEnvelope(userId, serverEnvelope);

    // Update Zustand state
    useVaultStore.setState({ vaultEnvelope: serverEnvelope });

    return serverEnvelope;
  } catch (error) {
    console.error('[vault-store] Error fetching envelope from server:', error);
    return null;
  }
}
