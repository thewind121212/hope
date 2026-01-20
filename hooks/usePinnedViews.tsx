'use client';

import { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { PinnedView } from '@/lib/types';
import { 
  getPinnedViews as loadPinnedViews, 
  addPinnedView as saveNewPinnedView,
  updatePinnedView as saveUpdatedPinnedView,
  deletePinnedView as removePinnedView,
} from '@/lib/pinnedViewsStorage';
import { useDataRefreshStore } from '@/stores/data-refresh-store';
import { useSyncOptional } from '@/hooks/useSyncProvider';

// State and actions
interface PinnedViewsState {
  pinnedViews: PinnedView[];
  isLoading: boolean;
  error: string | null;
}

type PinnedViewsAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; pinnedViews: PinnedView[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'ADD_PINNED_VIEW'; pinnedView: PinnedView }
  | { type: 'UPDATE_PINNED_VIEW'; pinnedView: PinnedView }
  | { type: 'DELETE_PINNED_VIEW'; viewId: string }
  | { type: 'SET_PINNED_VIEWS'; pinnedViews: PinnedView[] };

function pinnedViewsReducer(state: PinnedViewsState, action: PinnedViewsAction): PinnedViewsState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_SUCCESS':
      return { pinnedViews: action.pinnedViews, isLoading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'ADD_PINNED_VIEW':
      return { ...state, pinnedViews: [...state.pinnedViews, action.pinnedView] };
    case 'UPDATE_PINNED_VIEW':
      return {
        ...state,
        pinnedViews: state.pinnedViews.map(v => v.id === action.pinnedView.id ? action.pinnedView : v),
      };
    case 'DELETE_PINNED_VIEW':
      return {
        ...state,
        pinnedViews: state.pinnedViews.filter(v => v.id !== action.viewId),
      };
    case 'SET_PINNED_VIEWS':
      return { ...state, pinnedViews: action.pinnedViews };
    default:
      return state;
  }
}

// Context
interface PinnedViewsContextValue {
  pinnedViews: PinnedView[];
  isLoading: boolean;
  error: string | null;
  addPinnedView: (input: {
    spaceId: string;
    name: string;
    searchQuery?: string;
    tag?: string;
    sortKey?: PinnedView['sortKey'];
  }) => PinnedView;
  updatePinnedView: (pinnedView: PinnedView) => void;
  deletePinnedView: (viewId: string) => boolean;
  getPinnedViewsForSpace: (spaceId: string) => PinnedView[];
  refreshPinnedViews: () => void;
  importPinnedViews: (pinnedViews: PinnedView[]) => void;
}

const PinnedViewsContext = createContext<PinnedViewsContextValue | null>(null);

export function PinnedViewsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pinnedViewsReducer, {
    pinnedViews: [],
    isLoading: true,
    error: null,
  });

  // Sync context (optional - won't exist if outside SyncProvider)
  const syncContext = useSyncOptional();
  
  // Data refresh store - when refreshKey changes, reload from localStorage
  const { refreshKey } = useDataRefreshStore();
  const initialLoadDone = useRef(false);

  // Queue sync operation helper - uses SyncProvider's queuePinnedViewSync
  const queueSync = useCallback((pinnedView: PinnedView, deleted: boolean = false) => {
    if (syncContext) {
      syncContext.queuePinnedViewSync(pinnedView, deleted);
    }
  }, [syncContext]);

  // Load pinned views on mount
  useEffect(() => {
    dispatch({ type: 'LOAD_START' });
    try {
      const pinnedViews = loadPinnedViews();
      dispatch({ type: 'LOAD_SUCCESS', pinnedViews });
      initialLoadDone.current = true;
    } catch (error) {
      dispatch({ type: 'LOAD_ERROR', error: 'Failed to load pinned views' });
    }
  }, []);

  // Refresh from localStorage when refreshKey changes (triggered after cloud pull)
  useEffect(() => {
    if (!initialLoadDone.current || refreshKey === 0) return;
    
    const pinnedViews = loadPinnedViews();
    dispatch({ type: 'SET_PINNED_VIEWS', pinnedViews });
  }, [refreshKey]);

  const addPinnedView = useCallback((input: {
    spaceId: string;
    name: string;
    searchQuery?: string;
    tag?: string;
    sortKey?: PinnedView['sortKey'];
  }): PinnedView => {
    const newView: PinnedView = {
      id: uuidv4(),
      spaceId: input.spaceId,
      name: input.name.trim(),
      searchQuery: input.searchQuery ?? '',
      tag: input.tag ?? 'all',
      sortKey: input.sortKey ?? 'newest',
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const views = loadPinnedViews();
    const updated = [...views, newView];
    localStorage.setItem('bookmark-vault-pinned-views', JSON.stringify(updated));

    // Update state
    dispatch({ type: 'ADD_PINNED_VIEW', pinnedView: newView });

    // Queue sync
    queueSync(newView);

    toast.success('View pinned');
    return newView;
  }, [queueSync]);

  const updatePinnedView = useCallback((pinnedView: PinnedView): void => {
    const result = saveUpdatedPinnedView(pinnedView);
    if (result) {
      dispatch({ type: 'UPDATE_PINNED_VIEW', pinnedView });
      queueSync(pinnedView);
    } else {
      toast.error('Failed to update pinned view');
    }
  }, [queueSync]);

  const deletePinnedView = useCallback((viewId: string): boolean => {
    const view = state.pinnedViews.find(v => v.id === viewId);
    const result = removePinnedView(viewId);
    if (result) {
      dispatch({ type: 'DELETE_PINNED_VIEW', viewId });
      // Queue delete for sync
      if (view) {
        queueSync(view, true);
      }
      toast.success('View unpinned');
      return true;
    } else {
      toast.error('Failed to delete pinned view');
      return false;
    }
  }, [state.pinnedViews, queueSync]);

  const getPinnedViewsForSpace = useCallback((spaceId: string): PinnedView[] => {
    return state.pinnedViews.filter(v => v.spaceId === spaceId);
  }, [state.pinnedViews]);

  const refreshPinnedViews = useCallback((): void => {
    const pinnedViews = loadPinnedViews();
    dispatch({ type: 'SET_PINNED_VIEWS', pinnedViews });
  }, []);

  const importPinnedViews = useCallback((pinnedViews: PinnedView[]): void => {
    localStorage.setItem('bookmark-vault-pinned-views', JSON.stringify(pinnedViews));
    dispatch({ type: 'SET_PINNED_VIEWS', pinnedViews });

    // Queue all for sync
    pinnedViews.forEach(view => {
      queueSync(view);
    });
  }, [queueSync]);

  return (
    <PinnedViewsContext.Provider value={{
      pinnedViews: state.pinnedViews,
      isLoading: state.isLoading,
      error: state.error,
      addPinnedView,
      updatePinnedView,
      deletePinnedView,
      getPinnedViewsForSpace,
      refreshPinnedViews,
      importPinnedViews,
    }}>
      {children}
    </PinnedViewsContext.Provider>
  );
}

export function usePinnedViews(): PinnedViewsContextValue {
  const context = useContext(PinnedViewsContext);
  if (!context) {
    throw new Error('usePinnedViews must be used within a PinnedViewsProvider');
  }
  return context;
}
