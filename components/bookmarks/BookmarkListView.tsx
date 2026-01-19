"use client";

import { useRef } from "react";
import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar";
import FilterChips from "@/components/bookmarks/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import { BookmarkListSkeleton } from "@/components/bookmarks/BookmarkCardSkeleton";
import { SortKey } from "@/lib/bookmarks";
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
}: BookmarkListViewProps) {
  // Read from store
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTag = useUiStore((s) => s.selectedTag);
  const sortKey = useUiStore((s) => s.sortKey);

  // Store actions
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const setSelectedTag = useUiStore((s) => s.setSelectedTag);
  const setSortKey = useUiStore((s) => s.setSortKey);
  const clearSearch = useUiStore((s) => s.clearSearch);
  const clearAllFilters = useUiStore((s) => s.clearAllFilters);

  // Local ref for search input
  const searchInputRef = useRef<HTMLInputElement>(undefined);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    clearSearch();
  };

  const handleTagChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTag(event.target.value);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortKey(event.target.value as SortKey);
  };

  const isEmpty = !isInitialLoading && totalCount === 0;
  const isFilteredEmpty = !isInitialLoading && !isEmpty && resultsCount === 0;

  const hasActiveFilters = Boolean(
    searchQuery || selectedTag !== "all" || sortKey !== "newest"
  );

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <BookmarkToolbar
          onClearFilters={clearAllFilters}
          tagOptions={tagOptions}
          resultsCount={resultsCount}
          totalCount={totalCount}
          searchInputRef={searchInputRef}
        />
      </div>
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
