"use client";

import { create } from 'zustand';
import type { VaultKeyEnvelope } from '@/lib/types';

// Storage keys
const ENVELOPE_STORAGE_PREFIX = 'vault-envelope-';
const SESSION_STORAGE_KEY = 'vault-session';
const OLD_VAULT_STORAGE_KEY = 'vault-storage'; // Legacy key to clean up

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
  
  // Initialize store with user ID (call on sign-in / app load)
  initialize: (userId: string | null) => void;
  
  // Set envelope for current user (saves to localStorage)
  setEnvelope: (envelope: VaultKeyEnvelope) => void;
  
  // Clear envelope for current user (removes from localStorage)
  clearEnvelope: () => void;
  
  // Unlock vault (saves to sessionStorage)
  setUnlocked: (unlocked: boolean, key?: Uint8Array) => void;
  
  // Lock vault (clears sessionStorage unlock state)
  lock: () => void;
  
  // Clear all session state (call on sign-out)
  clearSession: () => void;
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
      });
    },
  };
});
