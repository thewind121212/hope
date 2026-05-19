"use client";

import { useMemo } from "react";
import { Plus, ArrowDownUp } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TagFilterPopover from "@/components/bookmarks/TagFilterPopover";
import SortDropdown from "@/components/bookmarks/SortDropdown";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useUiStore } from "@/stores/useUiStore";
import { getUniqueTags, SORT_OPTIONS, type SortKey } from "@/lib/bookmarks";
import { PERSONAL_SPACE_ID } from "@/lib/spacesStorage";

export default function BookmarkControlsPanel() {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTags = useUiStore((s) => s.selectedTags);
  const sortKey = useUiStore((s) => s.sortKey);
  const selectedSpaceId = useUiStore((s) => s.selectedSpaceId);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const toggleSelectedTag = useUiStore((s) => s.toggleSelectedTag);
  const clearSelectedTags = useUiStore((s) => s.clearSelectedTags);
  const setSortKey = useUiStore((s) => s.setSortKey);
  const clearAllFilters = useUiStore((s) => s.clearAllFilters);
  const openForm = useUiStore((s) => s.openForm);
  const openImportExport = useUiStore((s) => s.openImportExport);

  const { bookmarks, allBookmarks } = useBookmarks(searchQuery);

  const allInScope = useMemo(() => {
    if (selectedSpaceId === "all") return allBookmarks;
    return allBookmarks.filter(
      (b) => (b.spaceId ?? PERSONAL_SPACE_ID) === selectedSpaceId,
    );
  }, [allBookmarks, selectedSpaceId]);

  const inScope = useMemo(() => {
    if (selectedSpaceId === "all") return bookmarks;
    return bookmarks.filter(
      (b) => (b.spaceId ?? PERSONAL_SPACE_ID) === selectedSpaceId,
    );
  }, [bookmarks, selectedSpaceId]);

  const tagOptions = useMemo(() => getUniqueTags(allInScope), [allInScope]);

  const filteredCount = useMemo(
    () =>
      inScope.filter((b) => {
        if (selectedTags.length === 0) return true;
        return selectedTags.every((t) => b.tags.includes(t));
      }).length,
    [inScope, selectedTags],
  );

  const totalCount = allInScope.length;

  const hasActiveFilters = Boolean(
    searchQuery || selectedTags.length > 0 || sortKey !== "newest",
  );

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Button onClick={openForm} className="w-full justify-center">
        <Plus className="h-4 w-4" />
        Add bookmark
      </Button>

      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search…"
        aria-label="Search bookmarks"
      />

      <div className="grid grid-cols-2 gap-2">
        <TagFilterPopover
          tagOptions={tagOptions}
          selectedTags={selectedTags}
          onToggle={toggleSelectedTag}
          onClear={clearSelectedTags}
        />
        <SortDropdown
          ariaLabel="Sort by"
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={SORT_OPTIONS}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {filteredCount}
          </span>{" "}
          of {totalCount}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
          className="px-2 py-1 text-xs"
        >
          Clear
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-2 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          onClick={openImportExport}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs"
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          Import / Export
        </Button>
        <KeyboardShortcutsHelp position="bottom" />
      </div>
    </div>
  );
}
