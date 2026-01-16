import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  getBookmarks,
  deleteBookmark as deleteFromStorage,
  addBookmark as addToStorage,
  setBookmarks,
} from "@/lib/storage";
import { Bookmark } from "@/lib/types";

type AddBookmarkResult =
  | { success: true; bookmark: Bookmark }
  | { success: false; error: string };

type DeleteBookmarkResult = { success: true } | { success: false; error: string };

type ImportResult = { success: true } | { success: false; error: string };

type Action =
  | { type: "ADD_BOOKMARK"; bookmark: Bookmark }
  | { type: "ADD_BOOKMARK_SUCCESS"; tempId: string; bookmark: Bookmark }
  | { type: "ADD_BOOKMARK_ERROR"; tempId: string; error: string }
  | { type: "DELETE_BOOKMARK"; id: string }
  | { type: "DELETE_BOOKMARK_SUCCESS"; id: string }
  | { type: "DELETE_BOOKMARK_ERROR"; id: string; error: string }
  | { type: "IMPORT_BOOKMARKS_SUCCESS"; bookmarks: Bookmark[] }
  | { type: "IMPORT_BOOKMARKS_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

interface BookmarksState {
  bookmarks: Bookmark[];
  pendingAdds: Set<string>;
  pendingDeletes: Set<string>;
  error: string | null;
}

interface BookmarksContextValue {
  state: BookmarksState;
  simulateError: boolean;
  setSimulateError: (value: boolean) => void;
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt">) => AddBookmarkResult;
  deleteBookmark: (id: string) => DeleteBookmarkResult;
  importBookmarks: (bookmarks: Bookmark[]) => Promise<ImportResult>;
  clearError: () => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

const initialState = (): BookmarksState => ({
  bookmarks: getBookmarks(),
  pendingAdds: new Set(),
  pendingDeletes: new Set(),
  error: null,
});

const addToSet = (set: Set<string>, value: string) => {
  const next = new Set(set);
  next.add(value);
  return next;
};

const removeFromSet = (set: Set<string>, value: string) => {
  const next = new Set(set);
  next.delete(value);
  return next;
};

const replaceBookmark = (
  bookmarks: Bookmark[],
  tempId: string,
  nextBookmark: Bookmark
) => {
  let replaced = false;
  const updated = bookmarks.map((bookmark) => {
    if (bookmark.id === tempId) {
      replaced = true;
      return nextBookmark;
    }
    return bookmark;
  });

  return replaced ? updated : [...updated, nextBookmark];
};

function reducer(state: BookmarksState, action: Action): BookmarksState {
  switch (action.type) {
    case "ADD_BOOKMARK":
      return {
        ...state,
        bookmarks: [...state.bookmarks, action.bookmark],
        pendingAdds: addToSet(state.pendingAdds, action.bookmark.id),
        error: null,
      };
    case "ADD_BOOKMARK_SUCCESS":
      return {
        ...state,
        bookmarks: replaceBookmark(
          state.bookmarks,
          action.tempId,
          action.bookmark
        ),
        pendingAdds: removeFromSet(state.pendingAdds, action.tempId),
        error: null,
      };
    case "ADD_BOOKMARK_ERROR":
      return {
        ...state,
        bookmarks: state.bookmarks.filter(
          (bookmark) => bookmark.id !== action.tempId
        ),
        pendingAdds: removeFromSet(state.pendingAdds, action.tempId),
        error: action.error,
      };
    case "DELETE_BOOKMARK":
      return {
        ...state,
        pendingDeletes: addToSet(state.pendingDeletes, action.id),
        error: null,
      };
    case "DELETE_BOOKMARK_SUCCESS":
      return {
        ...state,
        bookmarks: state.bookmarks.filter(
          (bookmark) => bookmark.id !== action.id
        ),
        pendingDeletes: removeFromSet(state.pendingDeletes, action.id),
        error: null,
      };
    case "DELETE_BOOKMARK_ERROR":
      return {
        ...state,
        pendingDeletes: removeFromSet(state.pendingDeletes, action.id),
        error: action.error,
      };
    case "IMPORT_BOOKMARKS_SUCCESS":
      return {
        ...state,
        bookmarks: action.bookmarks,
        pendingAdds: new Set(),
        pendingDeletes: new Set(),
        error: null,
      };
    case "IMPORT_BOOKMARKS_ERROR":
      return {
        ...state,
        error: action.error,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [simulateError, setSimulateError] = useState(false);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const addBookmark = useCallback(
    (bookmark: Omit<Bookmark, "id" | "createdAt">): AddBookmarkResult => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const optimisticBookmark: Bookmark = {
        ...bookmark,
        id: tempId,
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: "ADD_BOOKMARK", bookmark: optimisticBookmark });

      setTimeout(() => {
        if (simulateError) {
          dispatch({
            type: "ADD_BOOKMARK_ERROR",
            tempId,
            error:
              "Unable to save bookmark. Please check your browser storage settings.",
          });
          return;
        }

        const savedBookmark = addToStorage(bookmark);
        const stored = getBookmarks().some(
          (item) => item.id === savedBookmark.id
        );

        if (!stored) {
          dispatch({
            type: "ADD_BOOKMARK_ERROR",
            tempId,
            error:
              "Unable to save bookmark. Please check your browser storage settings.",
          });
          return;
        }

        dispatch({
          type: "ADD_BOOKMARK_SUCCESS",
          tempId,
          bookmark: savedBookmark,
        });
      }, 0);

      return { success: true, bookmark: optimisticBookmark };
    },
    [simulateError]
  );

  const deleteBookmark = useCallback(
    (id: string): DeleteBookmarkResult => {
      dispatch({ type: "DELETE_BOOKMARK", id });

      setTimeout(() => {
        if (simulateError) {
          dispatch({
            type: "DELETE_BOOKMARK_ERROR",
            id,
            error:
              "Unable to delete bookmark. Please check your browser storage settings.",
          });
          return;
        }

        deleteFromStorage(id);
        const stillExists = getBookmarks().some((bookmark) => bookmark.id === id);

        if (stillExists) {
          dispatch({
            type: "DELETE_BOOKMARK_ERROR",
            id,
            error:
              "Unable to delete bookmark. Please check your browser storage settings.",
          });
          return;
        }

        dispatch({ type: "DELETE_BOOKMARK_SUCCESS", id });
      }, 0);

      return { success: true };
    },
    [simulateError]
  );

  const importBookmarks = useCallback(
    (bookmarks: Bookmark[]): Promise<ImportResult> =>
      new Promise((resolve) => {
        setTimeout(() => {
          if (simulateError) {
            const error =
              "Unable to import bookmarks. Please check your browser storage settings.";
            dispatch({ type: "IMPORT_BOOKMARKS_ERROR", error });
            resolve({ success: false, error });
            return;
          }

          const stored = setBookmarks(bookmarks);
          if (!stored) {
            const error =
              "Unable to import bookmarks. Please check your browser storage settings.";
            dispatch({ type: "IMPORT_BOOKMARKS_ERROR", error });
            resolve({ success: false, error });
            return;
          }

          dispatch({ type: "IMPORT_BOOKMARKS_SUCCESS", bookmarks });
          resolve({ success: true });
        }, 0);
      }),
    [simulateError]
  );

  const value = useMemo(
    () => ({
      state,
      simulateError,
      setSimulateError,
      addBookmark,
      deleteBookmark,
      importBookmarks,
      clearError,
    }),
    [
      state,
      simulateError,
      setSimulateError,
      addBookmark,
      deleteBookmark,
      importBookmarks,
      clearError,
    ]
  );

  return createElement(BookmarksContext.Provider, { value }, children);
}

export function useBookmarks(searchTerm: string = "") {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarks must be used within BookmarksProvider");
  }

  const { state } = context;
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredBookmarks = useMemo(() => {
    if (!debouncedSearchTerm) return state.bookmarks;
    const query = debouncedSearchTerm.toLowerCase();
    return state.bookmarks.filter(
      (bookmark) =>
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.url.toLowerCase().includes(query) ||
        bookmark.description?.toLowerCase().includes(query) ||
        bookmark.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [state.bookmarks, debouncedSearchTerm]);

  return {
    bookmarks: filteredBookmarks,
    allBookmarks: state.bookmarks,
    pendingAdds: state.pendingAdds,
    pendingDeletes: state.pendingDeletes,
    isLoading: state.pendingAdds.size > 0 || state.pendingDeletes.size > 0,
    errorMessage: state.error,
    simulateError: context.simulateError,
    setSimulateError: context.setSimulateError,
    clearError: context.clearError,
    addBookmark: context.addBookmark,
    deleteBookmark: context.deleteBookmark,
    importBookmarks: context.importBookmarks,
  };
}
