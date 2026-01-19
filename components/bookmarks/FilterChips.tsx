"use client";

import { SortKey } from "@/lib/bookmarks";
import { SORT_OPTIONS } from "@/lib/bookmarks";

// Simple X icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

interface FilterChipsProps {
  searchQuery: string;
  selectedTag: string;
  sortKey: SortKey;
  onClearSearch: () => void;
  onClearTag: () => void;
  onResetSort: () => void;
}

/**
 * Visual indicator pills showing active filters with quick remove buttons.
 * Only displays chips for non-default filter values.
 */
export default function FilterChips({
  searchQuery,
  selectedTag,
  sortKey,
  onClearSearch,
  onClearTag,
  onResetSort,
}: FilterChipsProps) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  // Search chip
  if (searchQuery) {
    chips.push({
      key: "search",
      label: `Search: "${searchQuery}"`,
      onRemove: onClearSearch,
    });
  }

  // Tag chip
  if (selectedTag && selectedTag !== "all") {
    chips.push({
      key: "tag",
      label: `Tag: ${selectedTag}`,
      onRemove: onClearTag,
    });
  }

  // Sort chip
  if (sortKey !== "newest") {
    const sortOption = SORT_OPTIONS.find((opt) => opt.value === sortKey);
    chips.push({
      key: "sort",
      label: `Sort: ${sortOption?.label || sortKey}`,
      onRemove: onResetSort,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-sm text-slate-700 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
          role="listitem"
          aria-label={`Remove filter: ${chip.label}`}
        >
          <span>{chip.label}</span>
          <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
