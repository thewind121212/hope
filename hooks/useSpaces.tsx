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
import type { Space } from '@/lib/types';
import { 
  getSpaces as loadSpaces, 
  addSpace as saveNewSpace,
  updateSpace as saveUpdatedSpace,
  deleteSpace as removeSpace,
  PERSONAL_SPACE_ID,
  ensureDefaultSpace,
} from '@/lib/spacesStorage';
import { useDataRefreshStore } from '@/stores/data-refresh-store';
import { useSyncOptional } from '@/hooks/useSyncProvider';

// State and actions
interface SpacesState {
  spaces: Space[];
  isLoading: boolean;
  error: string | null;
}

type SpacesAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; spaces: Space[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'ADD_SPACE'; space: Space }
  | { type: 'UPDATE_SPACE'; space: Space }
  | { type: 'DELETE_SPACE'; spaceId: string }
  | { type: 'SET_SPACES'; spaces: Space[] };

function spacesReducer(state: SpacesState, action: SpacesAction): SpacesState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_SUCCESS':
      return { spaces: action.spaces, isLoading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'ADD_SPACE':
      return { ...state, spaces: [...state.spaces, action.space] };
    case 'UPDATE_SPACE':
      return {
        ...state,
        spaces: state.spaces.map(s => s.id === action.space.id ? action.space : s),
      };
    case 'DELETE_SPACE':
      return {
        ...state,
        spaces: state.spaces.filter(s => s.id !== action.spaceId),
      };
    case 'SET_SPACES':
      return { ...state, spaces: action.spaces };
    default:
      return state;
  }
}

// Context
interface SpacesContextValue {
  spaces: Space[];
  isLoading: boolean;
  error: string | null;
  addSpace: (input: { name: string; color?: string }) => Space;
  updateSpace: (space: Space) => void;
  deleteSpace: (spaceId: string) => boolean;
  getSpace: (spaceId: string) => Space | undefined;
  refreshSpaces: () => void;
  importSpaces: (spaces: Space[]) => void;
}

const SpacesContext = createContext<SpacesContextValue | null>(null);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(spacesReducer, {
    spaces: [],
    isLoading: true,
    error: null,
  });

  // Sync context (optional - won't exist if outside SyncProvider)
  const syncContext = useSyncOptional();
  
  // Data refresh store - when refreshKey changes, reload from localStorage
  const { refreshKey } = useDataRefreshStore();
  const initialLoadDone = useRef(false);

  // Queue sync operation helper - uses SyncProvider's queueSpaceSync
  const queueSync = useCallback((space: Space, deleted: boolean = false) => {
    if (syncContext) {
      syncContext.queueSpaceSync(space, deleted);
    }
  }, [syncContext]);

  // Load spaces on mount
  useEffect(() => {
    dispatch({ type: 'LOAD_START' });
    try {
      ensureDefaultSpace();
      const spaces = loadSpaces();
      dispatch({ type: 'LOAD_SUCCESS', spaces });
      initialLoadDone.current = true;
    } catch (error) {
      dispatch({ type: 'LOAD_ERROR', error: 'Failed to load spaces' });
    }
  }, []);

  // Refresh from localStorage when refreshKey changes (triggered after cloud pull)
  useEffect(() => {
    if (!initialLoadDone.current || refreshKey === 0) return;
    
    const spaces = loadSpaces();
    dispatch({ type: 'SET_SPACES', spaces });
  }, [refreshKey]);

  const addSpace = useCallback((input: { name: string; color?: string }): Space => {
    const newSpace: Space = {
      id: uuidv4(),
      name: input.name.trim(),
      color: input.color,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const spaces = loadSpaces();
    const updated = [...spaces, newSpace];
    localStorage.setItem('bookmark-vault-spaces', JSON.stringify(updated));

    // Update state
    dispatch({ type: 'ADD_SPACE', space: newSpace });

    // Queue sync
    queueSync(newSpace);

    toast.success('Space created');
    return newSpace;
  }, [queueSync]);

  const updateSpace = useCallback((space: Space): void => {
    const result = saveUpdatedSpace(space);
    if (result) {
      dispatch({ type: 'UPDATE_SPACE', space });
      queueSync(space);
      toast.success('Space updated');
    } else {
      toast.error('Failed to update space');
    }
  }, [queueSync]);

  const deleteSpace = useCallback((spaceId: string): boolean => {
    if (spaceId === PERSONAL_SPACE_ID) {
      toast.error('Cannot delete Personal space');
      return false;
    }

    const space = state.spaces.find(s => s.id === spaceId);
    const result = removeSpace(spaceId);
    if (result) {
      dispatch({ type: 'DELETE_SPACE', spaceId });
      // Queue delete for sync
      if (space) {
        queueSync(space, true);
      }
      toast.success('Space deleted');
      return true;
    } else {
      toast.error('Failed to delete space');
      return false;
    }
  }, [state.spaces, queueSync]);

  const getSpace = useCallback((spaceId: string): Space | undefined => {
    return state.spaces.find(s => s.id === spaceId);
  }, [state.spaces]);

  const refreshSpaces = useCallback((): void => {
    const spaces = loadSpaces();
    dispatch({ type: 'SET_SPACES', spaces });
  }, []);

  const importSpaces = useCallback((spaces: Space[]): void => {
    // Ensure personal space exists
    const hasPersonal = spaces.some(s => s.id === PERSONAL_SPACE_ID);
    const finalSpaces = hasPersonal ? spaces : [ensureDefaultSpace(), ...spaces];
    
    localStorage.setItem('bookmark-vault-spaces', JSON.stringify(finalSpaces));
    dispatch({ type: 'SET_SPACES', spaces: finalSpaces });

    // Queue all for sync
    finalSpaces.forEach(space => {
      queueSync(space);
    });
  }, [queueSync]);

  return (
    <SpacesContext.Provider value={{
      spaces: state.spaces,
      isLoading: state.isLoading,
      error: state.error,
      addSpace,
      updateSpace,
      deleteSpace,
      getSpace,
      refreshSpaces,
      importSpaces,
    }}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces(): SpacesContextValue {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error('useSpaces must be used within a SpacesProvider');
  }
  return context;
}
