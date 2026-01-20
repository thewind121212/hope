"use client";

/**
 * Data Refresh Store
 * 
 * A simple Zustand store that allows triggering a refresh of data
 * across all hooks (bookmarks, spaces, pinned views).
 * 
 * When cloud data is pulled and applied to localStorage, calling
 * triggerRefresh() will cause all subscribed hooks to reload their
 * state from localStorage.
 */

import { create } from 'zustand';

interface DataRefreshState {
  // A counter that increments on each refresh trigger
  refreshKey: number;
  
  // Trigger a refresh - all hooks watching refreshKey will reload
  triggerRefresh: () => void;
}

export const useDataRefreshStore = create<DataRefreshState>()((set) => ({
  refreshKey: 0,
  
  triggerRefresh: () => {
    set((state) => ({ refreshKey: state.refreshKey + 1 }));
  },
}));
