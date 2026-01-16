"use client";

import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar";
import EmptyState from "@/components/ui/EmptyState";
import { SortKey } from "@/lib/bookmarks";

interface BookmarkListViewProps {
  searchQuery: string;
  selectedTag: string;
  sortKey: SortKey;
  tagOptions: string[];
  resultsCount: number;
  totalCount: number;
  errorMessage: string | null;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onTagChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  cardsContainerRef: React.RefObject<HTMLDivElement | null>;
  cards: React.ReactNode;
}

export default function BookmarkListView({
  searchQuery,
  selectedTag,
  sortKey,
  tagOptions,
  resultsCount,
  totalCount,
  errorMessage,
  onSearchChange,
  onClearSearch,
  onTagChange,
  onSortChange,
  searchInputRef,
  cardsContainerRef,
  cards,
}: BookmarkListViewProps) {
  const isEmpty = totalCount === 0;
  const isFilteredEmpty = !isEmpty && resultsCount === 0;

  return (
    <div className="space-y-6">
      <BookmarkToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onClearSearch={onClearSearch}
        tagOptions={tagOptions}
        selectedTag={selectedTag}
        onTagChange={onTagChange}
        sortKey={sortKey}
        onSortChange={onSortChange}
        resultsCount={resultsCount}
        totalCount={totalCount}
        searchInputRef={searchInputRef}
      />
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {isEmpty ? (
        <EmptyState
          title="No bookmarks yet"
          description="Add your first bookmark to get started."
        />
      ) : isFilteredEmpty ? (
        <EmptyState
          title="No results found"
          description="Try adjusting your search or filters."
          actionLabel="Clear filters"
          onAction={onClearSearch}
        />
      ) : (
        <div
          ref={cardsContainerRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {cards}
        </div>
      )}
    </div>
  );
}
