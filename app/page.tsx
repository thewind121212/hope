"use client";

import { useRef, useState } from "react";
import AddBookmarkForm from "@/components/AddBookmarkForm";
import BookmarkList from "@/components/BookmarkList";
import ErrorBoundary from "@/components/ErrorBoundary";
import ExportButton from "@/components/ExportButton";
import ImportButton from "@/components/ImportButton";
import { BookmarksProvider } from "@/hooks/useBookmarks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const clearFormRef = useRef<(() => void) | null>(null);

  useKeyboardShortcuts({
    titleInputRef,
    searchInputRef,
    cardsContainerRef,
    onClearForm: () => clearFormRef.current?.(),
    onClearSearch: () => setSearchQuery(""),
  });

  return (
    <ErrorBoundary>
      <BookmarksProvider>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <ImportButton />
            <ExportButton />
          </div>
          <AddBookmarkForm
            titleInputRef={titleInputRef}
            clearFormRef={clearFormRef}
          />
          <BookmarkList
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchInputRef={searchInputRef}
            cardsContainerRef={cardsContainerRef}
          />
        </div>
      </BookmarksProvider>
    </ErrorBoundary>
  );
}
