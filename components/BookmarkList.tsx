"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import BookmarkCard from "./BookmarkCard";

interface BookmarkListProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  cardsContainerRef: React.RefObject<HTMLDivElement | null>;
}

const useRenderCounter = (label: string, enabled: boolean) => {
  const renderCount = useRef(0);
  const [isMounted, setIsMounted] = useState(false);

  renderCount.current += 1;

  useEffect(() => {
    setIsMounted(true);
    if (enabled) {
      console.debug(`[Render] ${label}: ${renderCount.current}`);
    }
  });

  return { count: renderCount.current, isMounted };
};

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const SearchInput = memo(function SearchInput({
  searchQuery,
  onSearchChange,
  searchInputRef,
}: SearchInputProps) {
  return (
    <input
      ref={searchInputRef}
      type="text"
      placeholder="Search bookmarks..."
      value={searchQuery}
      onChange={onSearchChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
});

interface DevToolsPanelProps {
  simulateError: boolean;
  onSimulateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  renderCount: number;
  showRenderCount: boolean;
}

const DevToolsPanel = memo(function DevToolsPanel({
  simulateError,
  onSimulateChange,
  renderCount,
  showRenderCount,
}: DevToolsPanelProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={simulateError}
          onChange={onSimulateChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Simulate Error
      </label>
      {showRenderCount && (
        <p className="text-xs text-gray-500">List renders: {renderCount}</p>
      )}
    </div>
  );
});

interface EmptyStateProps {
  allBookmarks: number;
  filteredBookmarks: number;
  searchQuery: string;
}

const EmptyState = memo(function EmptyState({
  allBookmarks,
  filteredBookmarks,
  searchQuery,
}: EmptyStateProps) {
  if (allBookmarks === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No bookmarks yet.</p>
        <p className="text-sm">Add your first bookmark above!</p>
      </div>
    );
  }

  if (filteredBookmarks === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No bookmarks match &ldquo;{searchQuery}&rdquo;</p>
      </div>
    );
  }

  return null;
});

interface BookmarkGridProps {
  cardsContainerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

const BookmarkGrid = memo(function BookmarkGrid({
  cardsContainerRef,
  children,
}: BookmarkGridProps) {
  return (
    <div
      ref={cardsContainerRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {children}
    </div>
  );
});

export default function BookmarkList({
  searchQuery,
  onSearchChange,
  searchInputRef,
  cardsContainerRef,
}: BookmarkListProps) {
  const {
    bookmarks,
    allBookmarks,
    deleteBookmark,
    errorMessage,
    clearError,
    pendingAdds,
    pendingDeletes,
    simulateError,
    setSimulateError,
  } = useBookmarks(searchQuery);
  const showDevTools = process.env.NODE_ENV !== "production";
  const renderCounter = useRenderCounter("BookmarkList", showDevTools);

  const handleDelete = useCallback(
    (id: string, title: string) => {
      if (window.confirm(`Delete "${title}"?`)) {
        deleteBookmark(id);
      }
    },
    [deleteBookmark]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
      if (errorMessage) {
        clearError();
      }
    },
    [onSearchChange, errorMessage, clearError]
  );

  const handleSimulateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSimulateError(event.target.checked);
      if (errorMessage) {
        clearError();
      }
    },
    [setSimulateError, errorMessage, clearError]
  );

  const bookmarkCards = useMemo(
    () =>
      bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={handleDelete}
          isPendingAdd={pendingAdds.has(bookmark.id)}
          isPendingDelete={pendingDeletes.has(bookmark.id)}
        />
      )),
    [bookmarks, handleDelete, pendingAdds, pendingDeletes]
  );

  return (
    <div className="space-y-4">
      <SearchInput
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchInputRef={searchInputRef}
      />

      {showDevTools && (
        <DevToolsPanel
          simulateError={simulateError}
          onSimulateChange={handleSimulateChange}
          renderCount={renderCounter.count}
          showRenderCount={renderCounter.isMounted}
        />
      )}

      {errorMessage && (
        <p className="text-sm text-red-600 text-center">{errorMessage}</p>
      )}

      <EmptyState
        allBookmarks={allBookmarks.length}
        filteredBookmarks={bookmarks.length}
        searchQuery={searchQuery}
      />

      {allBookmarks.length > 0 && bookmarks.length > 0 && (
        <BookmarkGrid cardsContainerRef={cardsContainerRef}>
          {bookmarkCards}
        </BookmarkGrid>
      )}
    </div>
  );
}
