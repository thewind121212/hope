"use client";

import { useRef } from "react";
import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar";
import FilterChips from "@/components/bookmarks/FilterChips";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";
import { Button } from "@/components/ui";
import EmptyState from "@/components/ui/EmptyState";
import { BookmarkListSkeleton } from "@/components/bookmarks/BookmarkCardSkeleton";
import { useUiStore } from "@/stores/useUiStore";

interface BookmarkListViewProps {
  tagOptions: string[];
  resultsCount: number;
  totalCount: number;
  errorMessage: string | null;
  isInitialLoading?: boolean;
  cardsContainerRef: React.Ref<HTMLDivElement>;
  cards: React.ReactNode;
  onAddBookmark?: () => void;
  onOpenSpaces?: () => void;
  spacesLabel?: string;
}

export default function BookmarkListView({
  tagOptions,
  resultsCount,
  totalCount,
  errorMessage,
  isInitialLoading = false,
  cardsContainerRef,
  cards,
  onAddBookmark,
  onOpenSpaces,
  spacesLabel,
}: BookmarkListViewProps) {
  // Read from store
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTag = useUiStore((s) => s.selectedTag);
  const sortKey = useUiStore((s) => s.sortKey);

  // Store actions
  const setSelectedTag = useUiStore((s) => s.setSelectedTag);
  const setSortKey = useUiStore((s) => s.setSortKey);
  const clearSearch = useUiStore((s) => s.clearSearch);
  const clearAllFilters = useUiStore((s) => s.clearAllFilters);

  // Local ref for search input
  const searchInputRef = useRef<HTMLInputElement>(undefined);

  const handleClearSearch = () => {
    clearSearch();
  };

  const isEmpty = !isInitialLoading && totalCount === 0;
  const isFilteredEmpty = !isInitialLoading && !isEmpty && resultsCount === 0;

  const hasActiveFilters = Boolean(
    searchQuery || selectedTag !== "all" || sortKey !== "newest"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <KeyboardShortcutsHelp position="bottom" />
        <Button onClick={onAddBookmark} disabled={!onAddBookmark}>
          Add bookmark
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">Space</p>
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {spacesLabel ?? "Space"}
          </p>
        </div>
        {onOpenSpaces && (
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={onOpenSpaces}
          >
            Spaces
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <BookmarkToolbar
          onClearFilters={clearAllFilters}
          tagOptions={tagOptions}
          resultsCount={resultsCount}
          totalCount={totalCount}
          searchInputRef={searchInputRef}
        />

        {hasActiveFilters && (
          <FilterChips
            searchQuery={searchQuery}
            selectedTag={selectedTag}
            sortKey={sortKey}
            onClearSearch={handleClearSearch}
            onClearTag={() => setSelectedTag("all")}
            onResetSort={() => setSortKey("newest")}
          />
        )}
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {isInitialLoading ? (
        <BookmarkListSkeleton count={6} />
      ) : isEmpty ? (
        <EmptyState
          title="No bookmarks yet"
          description="Add your first bookmark to get started."
          actionLabel="Add your first bookmark"
          onAction={onAddBookmark}
        />
      ) : isFilteredEmpty ? (
        <EmptyState
          title="No results found"
          description="No bookmarks match your filters. Try different filters or clear all."
          actionLabel="Clear all filters"
          onAction={clearAllFilters}
        />
      ) : (
        <div
          ref={cardsContainerRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
        >
          {cards}
        </div>
      )}
    </div>
  );
}

