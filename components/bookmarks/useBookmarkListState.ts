"use client";

import { useCallback, useMemo, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { filterByTag, getUniqueTags, sortBookmarks, SortKey } from "@/lib/bookmarks";
import { Bookmark } from "@/lib/types";

interface UseBookmarkListStateProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTag: string;
  onTagChange: (value: string) => void;
  sortKey: SortKey;
  onSortChange: (value: SortKey) => void;
}

export function useBookmarkListState({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
  sortKey,
  onSortChange,
}: UseBookmarkListStateProps) {
  const {
    bookmarks,
    allBookmarks,
    deleteBookmark,
    errorMessage,
    clearError,
    pendingAdds,
    pendingDeletes,
    isInitialLoading,
    fetchPreview,
    refreshPreview,
  } = useBookmarks(searchQuery);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);

  const tagOptions = useMemo(() => getUniqueTags(allBookmarks), [allBookmarks]);
  const filteredBookmarks = useMemo(() => {
    const tagged = filterByTag(bookmarks, selectedTag);
    return sortBookmarks(tagged, sortKey);
  }, [bookmarks, selectedTag, sortKey]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
      if (errorMessage) clearError();
    },
    [onSearchChange, errorMessage, clearError]
  );
  const handleClearSearch = useCallback(() => {
    onSearchChange("");
    if (errorMessage) clearError();
  }, [onSearchChange, errorMessage, clearError]);
  const handleTagChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => onTagChange(event.target.value),
    [onTagChange]
  );
  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onSortChange(event.target.value as SortKey),
    [onSortChange]
  );
  const handleDeleteRequest = useCallback((bookmark: Bookmark) => {
    setDeleteTarget(bookmark);
  }, []);
  const handleEditRequest = useCallback((bookmark: Bookmark) => {
    setEditTarget(bookmark);
  }, []);
  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) deleteBookmark(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteBookmark, deleteTarget]);
  const handleCloseDelete = useCallback(() => setDeleteTarget(null), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);

  return {
    errorMessage,
    allBookmarksCount: allBookmarks.length,
    filteredBookmarks,
    tagOptions,
    pendingAdds,
    pendingDeletes,
    isInitialLoading,
    fetchPreview,
    refreshPreview,
    handleSearchChange,
    handleClearSearch,
    handleTagChange,
    handleSortChange,
    handleDeleteRequest,
    handleEditRequest,
    deleteTarget,
    editTarget,
    handleConfirmDelete,
    handleCloseDelete,
    handleCloseEdit,
  };
}
