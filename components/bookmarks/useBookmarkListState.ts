"use client";

import { useCallback, useMemo, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getUniqueTags, sortBookmarks } from "@/lib/bookmarks";
import { PERSONAL_SPACE_ID } from "@/lib/spacesStorage";
import { Bookmark } from "@/lib/types";
import { useUiStore } from "@/stores/useUiStore";

function getBookmarkSpaceId(bookmark: Bookmark): string {
  return bookmark.spaceId ?? PERSONAL_SPACE_ID;
}

export function useBookmarkListState() {
  // Read from store
  const selectedSpaceId = useUiStore((s) => s.selectedSpaceId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTags = useUiStore((s) => s.selectedTags);
  const sortKey = useUiStore((s) => s.sortKey);

  const {
    bookmarks,
    allBookmarks,
    deleteBookmark,
    errorMessage,
    pendingAdds,
    pendingDeletes,
    isInitialLoading,
    fetchPreview,
    refreshPreview,
  } = useBookmarks(searchQuery);

  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);

  const allBookmarksInScope = useMemo(() => {
    if (selectedSpaceId === "all") return allBookmarks;
    return allBookmarks.filter(
      (bookmark) => getBookmarkSpaceId(bookmark) === selectedSpaceId
    );
  }, [allBookmarks, selectedSpaceId]);

  const bookmarksInScope = useMemo(() => {
    if (selectedSpaceId === "all") return bookmarks;
    return bookmarks.filter(
      (bookmark) => getBookmarkSpaceId(bookmark) === selectedSpaceId
    );
  }, [bookmarks, selectedSpaceId]);

  const tagOptions = useMemo(
    () => getUniqueTags(allBookmarksInScope),
    [allBookmarksInScope]
  );

  const filteredBookmarks = useMemo(() => {
    const filtered = bookmarksInScope.filter((bookmark) => {
      if (selectedTags.length === 0) return true;
      return selectedTags.every((t) => bookmark.tags.includes(t));
    });

    return sortBookmarks(filtered, sortKey);
  }, [bookmarksInScope, selectedTags, sortKey]);

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
    allBookmarksCount: allBookmarksInScope.length,
    filteredBookmarks,
    tagOptions,
    pendingAdds,
    pendingDeletes,
    isInitialLoading,
    fetchPreview,
    refreshPreview,
    handleDeleteRequest,
    handleEditRequest,
    deleteTarget,
    editTarget,
    handleConfirmDelete,
    handleCloseDelete,
    handleCloseEdit,
  };
}
