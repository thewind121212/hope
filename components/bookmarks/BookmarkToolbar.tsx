"use client";

import { memo } from "react";
import BookmarkSearchBar from "@/components/bookmarks/BookmarkSearchBar";
import { Button, Select } from "@/components/ui";
import { SortKey, SORT_OPTIONS } from "@/lib/bookmarks";
import { useUiStore } from "@/stores/useUiStore";

interface BookmarkToolbarProps {
  onClearFilters: () => void;
  tagOptions: string[];
  resultsCount: number;
  totalCount: number;
  searchInputRef?: React.MutableRefObject<HTMLInputElement | null | undefined>;
}

function BookmarkToolbar({
  onClearFilters,
  tagOptions,
  resultsCount,
  totalCount,
  searchInputRef,
}: BookmarkToolbarProps) {
  // Read from store
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTag = useUiStore((s) => s.selectedTag);
  const sortKey = useUiStore((s) => s.sortKey);

  // Store actions
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const setSelectedTag = useUiStore((s) => s.setSelectedTag);
  const setSortKey = useUiStore((s) => s.setSortKey);
  const clearSearch = useUiStore((s) => s.clearSearch);

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

  const hasActiveFilters = Boolean(
    searchQuery || selectedTag !== "all" || sortKey !== "newest"
  );

  const tagSelectOptions = [
    { value: "all", label: "All tags" },
    ...tagOptions.map((tag) => ({ value: tag, label: tag })),
  ];

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
        <div className="sm:col-span-2 lg:col-auto">
          <BookmarkSearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            inputRef={searchInputRef}
          />
        </div>
        <Select
          label="Tag"
          value={selectedTag}
          onChange={handleTagChange}
          options={tagSelectOptions}
        />
        <Select
          label="Sort"
          value={sortKey}
          onChange={handleSortChange}
          options={SORT_OPTIONS}
        />
        <div className="flex items-end justify-end sm:col-span-2 lg:col-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear all
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Showing {resultsCount} of {totalCount} bookmarks
      </p>
    </div>
  );
}

// Apply memo for conservative optimization
export default memo(BookmarkToolbar);
