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
  onOpenImportExport?: () => void;
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
  onOpenImportExport,
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
      {/* Fixed mask to hide content scrolling through the gap between site header and sticky filter bar */}
      <div
        className="hidden lg:block fixed top-16 left-0 right-0 h-9 bg-white dark:bg-slate-950 z-10 pointer-events-none"
        aria-hidden="true"
      />
      <div className="lg:sticky lg:top-25 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-950/70 -mx-4 px-4 pt-4 pb-4">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your personal vault</p>
              <h2 className="text-2xl font-semibold">Manage your bookmarks</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {onAddBookmark && <Button onClick={onAddBookmark}>Add bookmark</Button>}
              {onOpenImportExport && (
                <Button
                  variant="secondary"
                  onClick={onOpenImportExport}
                  aria-label="Import or export bookmarks"
                >
                  <ImportExportIcon />
                </Button>
              )}
              <KeyboardShortcutsHelp position="bottom" />
            </div>
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

function ImportExportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}
