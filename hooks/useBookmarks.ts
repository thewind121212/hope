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
  deleteBookmarks as deleteManyFromStorage,
  addBookmark as addToStorage,
  updateBookmark as updateInStorage,
  setBookmarks,
  getPreview as getPreviewFromStorage,
  savePreview as savePreviewToStorage,
  clearStalePreviews,
} from "@/lib/storage";
import { Bookmark } from "@/lib/types";
import { toast } from "sonner";

type AddBookmarkResult =
  | { success: true; bookmark: Bookmark }
  | { success: false; error: string };

type DeleteBookmarkResult = { success: true } | { success: false; error: string };

type UpdateBookmarkResult = { success: true } | { success: false; error: string };

type ImportResult = { success: true } | { success: false; error: string };

type FetchPreviewResult =
  | { success: true; preview: NonNullable<Bookmark['preview']> }
  | { success: false; error: string };

type Action =
  | { type: "ADD_BOOKMARK"; bookmark: Bookmark }
  | { type: "ADD_BOOKMARK_SUCCESS"; tempId: string; bookmark: Bookmark }
  | { type: "ADD_BOOKMARK_ERROR"; tempId: string; error: string }
  | { type: "DELETE_BOOKMARK"; id: string }
  | { type: "DELETE_BOOKMARK_SUCCESS"; id: string }
  | { type: "DELETE_BOOKMARK_ERROR"; id: string; error: string }
  | { type: "BULK_DELETE_BOOKMARKS"; ids: string[] }
  | { type: "BULK_DELETE_BOOKMARKS_SUCCESS"; ids: string[] }
  | { type: "BULK_DELETE_BOOKMARKS_ERROR"; ids: string[]; error: string }
  | { type: "UPDATE_BOOKMARK_SUCCESS"; bookmark: Bookmark }
  | { type: "UPDATE_BOOKMARK_ERROR"; error: string }
  | { type: "IMPORT_BOOKMARKS_SUCCESS"; bookmarks: Bookmark[] }
  | { type: "IMPORT_BOOKMARKS_ERROR"; error: string }
  | { type: "UPDATE_PREVIEW_SUCCESS"; id: string; preview: NonNullable<Bookmark['preview']> }
  | { type: "CLEAR_ERROR" };

interface BookmarksState {
  bookmarks: Bookmark[];
  pendingAdds: Set<string>;
  pendingDeletes: Set<string>;
  error: string | null;
}

interface BookmarksContextValue {
  state: BookmarksState;
  isInitialLoading: boolean;
  simulateError: boolean;
  setSimulateError: (value: boolean) => void;
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt">) => AddBookmarkResult;
  deleteBookmark: (id: string) => DeleteBookmarkResult;
  bulkDelete: (ids: string[]) => Promise<{ success: true } | { success: false; error: string }>;
  updateBookmark: (bookmark: Bookmark) => UpdateBookmarkResult;
  importBookmarks: (bookmarks: Bookmark[]) => Promise<ImportResult>;
  fetchPreview: (id: string, url: string) => Promise<FetchPreviewResult>;
  refreshPreview: (id: string, url: string) => Promise<FetchPreviewResult>;
  clearError: () => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

const initialState: BookmarksState = {
  bookmarks: [],
  pendingAdds: new Set(),
  pendingDeletes: new Set(),
  error: null,
};

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

const updateBookmarkInState = (bookmarks: Bookmark[], updated: Bookmark) =>
  bookmarks.map((bookmark) =>
    bookmark.id === updated.id ? updated : bookmark
  );

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
    case "BULK_DELETE_BOOKMARKS":
      return {
        ...state,
        pendingDeletes: action.ids.reduce(
          (set, id) => addToSet(set, id),
          state.pendingDeletes
        ),
        error: null,
      };
    case "BULK_DELETE_BOOKMARKS_SUCCESS":
      return {
        ...state,
        bookmarks: state.bookmarks.filter(
          (bookmark) => !action.ids.includes(bookmark.id)
        ),
        pendingDeletes: action.ids.reduce(
          (set, id) => removeFromSet(set, id),
          state.pendingDeletes
        ),
        error: null,
      };
    case "BULK_DELETE_BOOKMARKS_ERROR":
      return {
        ...state,
        pendingDeletes: action.ids.reduce(
          (set, id) => removeFromSet(set, id),
          state.pendingDeletes
        ),
        error: action.error,
      };
    case "UPDATE_BOOKMARK_SUCCESS":
      return {
        ...state,
        bookmarks: updateBookmarkInState(state.bookmarks, action.bookmark),
        error: null,
      };
    case "UPDATE_BOOKMARK_ERROR":
      return {
        ...state,
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
    case "UPDATE_PREVIEW_SUCCESS":
      return {
        ...state,
        bookmarks: state.bookmarks.map((bookmark) =>
          bookmark.id === action.id
            ? { ...bookmark, preview: action.preview }
            : bookmark
        ),
        error: null,
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [simulateError, setSimulateError] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const storedBookmarks = getBookmarks();
    if (storedBookmarks.length > 0) {
      dispatch({
        type: "IMPORT_BOOKMARKS_SUCCESS",
        bookmarks: storedBookmarks,
      });
    }
    clearStalePreviews();
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
          const errorMessage =
            "Unable to save bookmark. Please check your browser storage settings.";
          dispatch({
            type: "ADD_BOOKMARK_ERROR",
            tempId,
            error: errorMessage,
          });
          toast.error(errorMessage);
          return;
        }

        const savedBookmark = addToStorage(bookmark);
        const stored = getBookmarks().some(
          (item) => item.id === savedBookmark.id
        );

        if (!stored) {
          const errorMessage =
            "Unable to save bookmark. Please check your browser storage settings.";
          dispatch({
            type: "ADD_BOOKMARK_ERROR",
            tempId,
            error: errorMessage,
          });
          toast.error(errorMessage);
          return;
        }

        dispatch({
          type: "ADD_BOOKMARK_SUCCESS",
          tempId,
          bookmark: savedBookmark,
        });
        toast.success("Bookmark added");
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
          const errorMessage =
            "Unable to delete bookmark. Please check your browser storage settings.";
          dispatch({
            type: "DELETE_BOOKMARK_ERROR",
            id,
            error: errorMessage,
          });
          toast.error(errorMessage);
          return;
        }

        deleteFromStorage(id);
        const stillExists = getBookmarks().some((bookmark) => bookmark.id === id);

        if (stillExists) {
          const errorMessage =
            "Unable to delete bookmark. Please check your browser storage settings.";
          dispatch({
            type: "DELETE_BOOKMARK_ERROR",
            id,
            error: errorMessage,
          });
          toast.error(errorMessage);
          return;
        }

        dispatch({ type: "DELETE_BOOKMARK_SUCCESS", id });
        toast.success("Bookmark deleted");
      }, 0);

      return { success: true };
    },
    [simulateError]
  );

  const bulkDelete = useCallback(
    (ids: string[]): Promise<{ success: true } | { success: false; error: string }> =>
      new Promise((resolve) => {
        if (ids.length === 0) {
          resolve({ success: true });
          return;
        }

        dispatch({ type: "BULK_DELETE_BOOKMARKS", ids });

        setTimeout(() => {
          if (simulateError) {
            const errorMessage =
              "Unable to delete bookmarks. Please check your browser storage settings.";
            dispatch({
              type: "BULK_DELETE_BOOKMARKS_ERROR",
              ids,
              error: errorMessage,
            });
            toast.error(errorMessage);
            resolve({ success: false, error: errorMessage });
            return;
          }

          deleteManyFromStorage(ids);
          const stillExist = getBookmarks().filter((bookmark) =>
            ids.includes(bookmark.id)
          );

          if (stillExist.length > 0) {
            const errorMessage =
              "Unable to delete some bookmarks. Please check your browser storage settings.";
            dispatch({
              type: "BULK_DELETE_BOOKMARKS_ERROR",
              ids,
              error: errorMessage,
            });
            toast.error(errorMessage);
            resolve({ success: false, error: errorMessage });
            return;
          }

          dispatch({ type: "BULK_DELETE_BOOKMARKS_SUCCESS", ids });
          toast.success(`Deleted ${ids.length} bookmark${ids.length > 1 ? "s" : ""}`);
          resolve({ success: true });
        }, 0);
      }),
    [simulateError]
  );

  const updateBookmark = useCallback(
    (bookmark: Bookmark): UpdateBookmarkResult => {
      setTimeout(() => {
        if (simulateError) {
          const errorMessage =
            "Unable to update bookmark. Please check your browser storage settings.";
          dispatch({ type: "UPDATE_BOOKMARK_ERROR", error: errorMessage });
          toast.error(errorMessage);
          return;
        }

        const updated = updateInStorage(bookmark);
        const stored = getBookmarks().some((item) => item.id === bookmark.id);

        if (!updated || !stored) {
          const errorMessage =
            "Unable to update bookmark. Please check your browser storage settings.";
          dispatch({ type: "UPDATE_BOOKMARK_ERROR", error: errorMessage });
          toast.error(errorMessage);
          return;
        }

        dispatch({ type: "UPDATE_BOOKMARK_SUCCESS", bookmark: updated });
        toast.success("Bookmark updated");
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

  const fetchPreview = useCallback(
    async (id: string, url: string): Promise<FetchPreviewResult> => {
      const cached = getPreviewFromStorage(id);
      if (cached) {
        dispatch({ type: "UPDATE_PREVIEW_SUCCESS", id, preview: cached });
        return { success: true, preview: cached };
      }

      try {
        const encodedUrl = encodeURIComponent(url);
        const res = await fetch(`/api/link-preview?url=${encodedUrl}`);
        if (!res.ok) {
          const error = await res.json().then((e) => e.error || "Failed to fetch preview");
          return { success: false, error };
        }

        const data = await res.json();
        if (data.status !== "success") {
          return { success: false, error: data.error || "Preview unavailable" };
        }

        const preview: NonNullable<Bookmark["preview"]> = {
          faviconUrl: data.faviconUrl,
          siteName: data.siteName,
          ogImageUrl: data.ogImageUrl,
          previewTitle: data.previewTitle,
          previewDescription: data.previewDescription,
          lastFetchedAt: data.lastFetchedAt,
        };

        savePreviewToStorage(id, preview);
        dispatch({ type: "UPDATE_PREVIEW_SUCCESS", id, preview });
        return { success: true, preview };
      } catch {
        return { success: false, error: "Failed to fetch preview" };
      }
    },
    []
  );

  const refreshPreview = useCallback(
    async (id: string, url: string): Promise<FetchPreviewResult> => {
      try {
        const encodedUrl = encodeURIComponent(url);
        const res = await fetch(`/api/link-preview?url=${encodedUrl}`);
        if (!res.ok) {
          const error = await res.json().then((e) => e.error || "Failed to refresh preview");
          return { success: false, error };
        }

        const data = await res.json();
        if (data.status !== "success") {
          return { success: false, error: data.error || "Preview unavailable" };
        }

        const preview: NonNullable<Bookmark["preview"]> = {
          faviconUrl: data.faviconUrl,
          siteName: data.siteName,
          ogImageUrl: data.ogImageUrl,
          previewTitle: data.previewTitle,
          previewDescription: data.previewDescription,
          lastFetchedAt: data.lastFetchedAt,
        };

        savePreviewToStorage(id, preview);
        dispatch({ type: "UPDATE_PREVIEW_SUCCESS", id, preview });
        toast.success("Preview refreshed");
        return { success: true, preview };
      } catch {
        toast.error("Failed to refresh preview");
        return { success: false, error: "Failed to refresh preview" };
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      state,
      isInitialLoading,
      simulateError,
      setSimulateError,
      addBookmark,
      deleteBookmark,
      bulkDelete,
      updateBookmark,
      importBookmarks,
      fetchPreview,
      refreshPreview,
      clearError,
    }),
    [
      state,
      isInitialLoading,
      simulateError,
      addBookmark,
      deleteBookmark,
      bulkDelete,
      updateBookmark,
      importBookmarks,
      fetchPreview,
      refreshPreview,
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
    isInitialLoading: context.isInitialLoading,
    errorMessage: state.error,
    simulateError: context.simulateError,
    setSimulateError: context.setSimulateError,
    clearError: context.clearError,
    addBookmark: context.addBookmark,
    deleteBookmark: context.deleteBookmark,
    bulkDelete: context.bulkDelete,
    updateBookmark: context.updateBookmark,
    importBookmarks: context.importBookmarks,
    fetchPreview: context.fetchPreview,
    refreshPreview: context.refreshPreview,
  };
}
