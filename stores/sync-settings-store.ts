"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncMode, SyncSettings } from '@/lib/types';

interface SyncSettingsState extends SyncSettings {
  // State
  isLoading: boolean;
  error: string | null;
  serverLoaded: boolean;

  // Actions
  setSyncEnabled: (enabled: boolean) => void;
  setSyncMode: (mode: SyncMode) => void;
  setLastSyncAt: (timestamp: string) => void;
  setGeminiApiKeyIsSet: (isSet: boolean) => void;
  updateGeminiApiKey: (token: string | null) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Sync with server
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;

  // Reset
  reset: () => void;
}

const defaultSettings: SyncSettings = {
  syncEnabled: false,
  syncMode: 'off',
  lastSyncAt: undefined,
  geminiApiKeyIsSet: false,
};

export const useSyncSettingsStore = create<SyncSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultSettings,
      isLoading: false,
      error: null,
      serverLoaded: false,

      // Simple setters
      setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
      setSyncMode: (mode) => set({
        syncMode: mode,
        syncEnabled: mode !== 'off',
      }),
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
      setGeminiApiKeyIsSet: (isSet) => set({ geminiApiKeyIsSet: isSet }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Update API key on server without storing locally
      updateGeminiApiKey: async (token) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          const res = await fetch('/api/sync/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              syncEnabled: state.syncEnabled,
              syncMode: state.syncMode,
              geminiApiToken: token,
            }),
          });

          if (!res.ok) {
            throw new Error('Failed to update API key');
          }

          const data = await res.json();
          set({
            geminiApiKeyIsSet: data.geminiApiKeyIsSet,
            isLoading: false
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          throw err;
        }
      },

      // Load settings from server (server is the source of truth)
      loadFromServer: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/sync/settings');
          if (!res.ok) {
            if (res.status === 401) {
              // Not signed in - force off and mark server NOT loaded
              set({
                ...defaultSettings,
                isLoading: false,
                serverLoaded: false,
              });
              return;
            }
            throw new Error('Failed to load sync settings');
          }
          const data = await res.json();
          set({
            syncEnabled: data.syncEnabled,
            syncMode: data.syncMode,
            lastSyncAt: data.lastSyncAt,
            geminiApiKeyIsSet: data.geminiApiKeyIsSet,
            isLoading: false,
            serverLoaded: true,
          });
        } catch (err) {
          // On error: do NOT trust stale local values. Force off until next load.
          set({
            ...defaultSettings,
            isLoading: false,
            serverLoaded: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      },

      // Save settings to server
      saveToServer: async () => {
        const state = get();
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/sync/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              syncEnabled: state.syncEnabled,
              syncMode: state.syncMode,
            }),
          });
          if (!res.ok) {
            throw new Error('Failed to save sync settings');
          }
          set({ isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          throw err;
        }
      },

      // Reset to defaults
      reset: () =>
        set({
          ...defaultSettings,
          isLoading: false,
          error: null,
          serverLoaded: false,
        }),
    }),
    {
      name: 'sync-settings-storage',
      // Server is source of truth for sync mode/enabled. Only persist
      // non-authoritative UI hints (last sync timestamp, key-presence flag).
      partialize: (state) => ({
        lastSyncAt: state.lastSyncAt,
        geminiApiKeyIsSet: state.geminiApiKeyIsSet,
      }),
    }
  )
);
