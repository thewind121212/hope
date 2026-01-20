"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncMode, SyncSettings } from '@/lib/types';

interface SyncSettingsState extends SyncSettings {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSyncEnabled: (enabled: boolean) => void;
  setSyncMode: (mode: SyncMode) => void;
  setLastSyncAt: (timestamp: string) => void;
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
};

export const useSyncSettingsStore = create<SyncSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultSettings,
      isLoading: false,
      error: null,

      // Simple setters
      setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
      setSyncMode: (mode) => set({ 
        syncMode: mode,
        syncEnabled: mode !== 'off',
      }),
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Load settings from server
      loadFromServer: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/sync/settings');
          if (!res.ok) {
            if (res.status === 401) {
              // Not signed in - keep defaults
              set({ isLoading: false });
              return;
            }
            throw new Error('Failed to load sync settings');
          }
          const data = await res.json();
          set({
            syncEnabled: data.syncEnabled,
            syncMode: data.syncMode,
            lastSyncAt: data.lastSyncAt,
            isLoading: false,
          });
        } catch (err) {
          set({ 
            isLoading: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
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
      reset: () => set({ ...defaultSettings, isLoading: false, error: null }),
    }),
    {
      name: 'sync-settings-storage',
      partialize: (state) => ({
        syncEnabled: state.syncEnabled,
        syncMode: state.syncMode,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
