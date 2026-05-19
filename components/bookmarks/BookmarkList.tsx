"use client";
import { useCallback, useMemo, useState } from "react";
import BookmarkCard from "@/components/bookmarks/BookmarkCard";
import BookmarkListDialogs from "@/components/bookmarks/BookmarkListDialogs";
import BookmarkListView from "@/components/bookmarks/BookmarkListView";
import BulkActionsBar from "@/components/bookmarks/BulkActionsBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useBookmarkListState } from "@/components/bookmarks/useBookmarkListState";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSpaces } from "@/hooks/useSpaces";
import { useUiStore } from "@/stores/useUiStore";

interface BookmarkListProps {
  cardsContainerRef: React.Ref<HTMLDivElement>;
  onAddBookmark?: () => void;
  onOpenSpaces?: () => void;
  spacesLabel?: string;
}

export default function BookmarkList({
  cardsContainerRef,
  onAddBookmark,
  onOpenSpaces,
  spacesLabel,
}: BookmarkListProps) {
  const {
    errorMessage,
    allBookmarksCount,
    filteredBookmarks,
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
  } = useBookmarkListState();

  const {
    selectedIds,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount,
  } = useBookmarkSelection();

  const visibleIds = useMemo(
    () => filteredBookmarks.map((b) => b.id),
    [filteredBookmarks]
  );

  const { bulkDelete, moveBookmarksByIds } = useBookmarks();
  const { spaces } = useSpaces();
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const result = await bulkDelete(ids);
    if (result.success) {
      clearSelection();
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleMoveToSpace = (spaceId: string) => {
    const ids = Array.from(selectedIds);
    const result = moveBookmarksByIds(ids, spaceId);
    if (result.success) {
      clearSelection();
    }
  };

  // Store action for tag click - memoize to prevent unnecessary re-renders
  const setSelectedTag = useUiStore((s) => s.setSelectedTag);
  const memoizedSetSelectedTag = useCallback(setSelectedTag, [setSelectedTag]);

  const cards = useMemo(
    () =>
      filteredBookmarks.map((bookmark) => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            onDelete={handleDeleteRequest}
            onEdit={handleEditRequest}
            onTagClick={memoizedSetSelectedTag}
            isPendingAdd={pendingAdds.has(bookmark.id)}
            isPendingDelete={pendingDeletes.has(bookmark.id)}
            isSelected={isSelected(bookmark.id)}
            onToggleSelect={() => toggle(bookmark.id)}
            fetchPreview={fetchPreview}
            refreshPreview={refreshPreview}
          />
      )),
    [
      filteredBookmarks,
      handleDeleteRequest,
      handleEditRequest,
      pendingAdds,
      pendingDeletes,
      isSelected,
      toggle,
      fetchPreview,
      refreshPreview,
      memoizedSetSelectedTag,
    ]
  );

  return (
    <div className="space-y-6">
      <BookmarkListView
        resultsCount={filteredBookmarks.length}
        totalCount={allBookmarksCount}
        errorMessage={errorMessage}
        isInitialLoading={isInitialLoading}
        cardsContainerRef={cardsContainerRef}
        cards={cards}
        onAddBookmark={onAddBookmark}
        onOpenSpaces={onOpenSpaces}
        spacesLabel={spacesLabel}
      />
      <BulkActionsBar
        selectedCount={selectedCount}
        visibleCount={visibleIds.length}
        onSelectAll={() => selectAll(visibleIds)}
        onClearSelection={clearSelection}
        onDeleteSelected={() => setShowBulkDeleteConfirm(true)}
        spaces={spaces}
        onMoveToSpace={handleMoveToSpace}
      />
      <BookmarkListDialogs
        editTarget={editTarget}
        deleteTarget={deleteTarget}
        onCloseEdit={handleCloseEdit}
        onCloseDelete={handleCloseDelete}
        onConfirmDelete={handleConfirmDelete}
      />
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title={`Delete ${selectedCount} bookmarks?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleBulkDelete}
        onClose={() => setShowBulkDeleteConfirm(false)}
      />
    </div>
  );
}
