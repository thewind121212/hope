"use client";

import { useRef, useState } from "react";
import BookmarkFormModal from "@/components/bookmarks/BookmarkFormModal";
import ImportExportModal from "@/components/bookmarks/ImportExportModal";
import BookmarkList from "@/components/BookmarkList";
import { Button } from "@/components/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SortKey } from "@/lib/bookmarks";
import { BookmarksProvider } from "@/hooks/useBookmarks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  useKeyboardShortcuts({
    titleInputRef,
    searchInputRef,
    cardsContainerRef,
    onClearForm: () => setIsFormOpen(false),
    onClearSearch: () => setSearchQuery(""),
    onOpenForm: () => setIsFormOpen(true),
  });

  return (
    <ErrorBoundary>
      <BookmarksProvider>
        <div className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Your personal vault</p>
              <h2 className="text-2xl font-semibold">Manage your bookmarks</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setIsFormOpen(true)}>Add bookmark</Button>
              <Button
                variant="secondary"
                onClick={() => setIsImportExportOpen(true)}
                aria-label="Import or export bookmarks"
              >
                <ImportExportIcon />
              </Button>
            </div>
          </div>
          <BookmarkFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            titleInputRef={titleInputRef}
          />
          <ImportExportModal
            isOpen={isImportExportOpen}
            onClose={() => setIsImportExportOpen(false)}
          />
          <BookmarkList
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            sortKey={sortKey}
            onSortChange={setSortKey}
            searchInputRef={searchInputRef}
            cardsContainerRef={cardsContainerRef}
          />
        </div>
      </BookmarksProvider>
    </ErrorBoundary>
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

