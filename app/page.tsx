"use client";

import { useMemo, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import BookmarkFormModal from "@/components/bookmarks/BookmarkFormModal";
import ImportExportModal from "@/components/bookmarks/ImportExportModal";
import BookmarkList from "@/components/BookmarkList";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";
import { BottomSheet, Button } from "@/components/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BookmarksProvider } from "@/hooks/useBookmarks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { runOnboardingMigration } from "@/lib/migration";
import { runSpacesMigration } from "@/lib/spacesMigration";
import { getSpaces } from "@/lib/spacesStorage";
import SpacesSidebar, { type SpaceSelection } from "@/components/spaces/SpacesSidebar";
import { useUiStore } from "@/stores/useUiStore";
import { useVaultStore } from "@/stores/vault-store";
import { UnlockScreen } from "@/components/vault/UnlockScreen";
import { useSyncOptional } from "@/hooks/useSyncProvider";
import { BookmarkListSkeleton } from "@/components/bookmarks/BookmarkCardSkeleton";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  // Sync state - must be called before any conditional returns
  const sync = useSyncOptional();

  // Read from store
  const selectedSpaceId = useUiStore((s) => s.selectedSpaceId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTag = useUiStore((s) => s.selectedTag);
  const sortKey = useUiStore((s) => s.sortKey);
  const isFormOpen = useUiStore((s) => s.isFormOpen);
  const isImportExportOpen = useUiStore((s) => s.isImportExportOpen);
  const isSpacesOpen = useUiStore((s) => s.isSpacesOpen);

  // Store actions
  const openForm = useUiStore((s) => s.openForm);
  const openImportExport = useUiStore((s) => s.openImportExport);
  const openSpaces = useUiStore((s) => s.openSpaces);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const closeForm = useUiStore((s) => s.closeForm);
  const applyPinnedView = useUiStore((s) => s.applyPinnedView);
  const setSelectedSpaceId = useUiStore((s) => s.setSelectedSpaceId);
  const closeSpaces = useUiStore((s) => s.closeSpaces);

  // Vault state
  const { vaultEnvelope, isUnlocked, currentUserId } = useVaultStore();

  // Local refs (not in store)
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Run migration on mount
  useEffect(() => {
    runOnboardingMigration();
    runSpacesMigration();
  }, []);

  useKeyboardShortcuts({
    titleInputRef,
    searchInputRef,
    cardsContainerRef,
  });

  const spacesLabel = useMemo(() => {
    if (selectedSpaceId === "all") return "All spaces";
    const match = getSpaces().find((space) => space.id === selectedSpaceId);
    return match?.name ?? "Space";
  }, [selectedSpaceId]);

  // Loading state - wait for auth and vault initialization, or during migration check
  if (!isLoaded || sync?.isCheckingMigration) {
    return (
      <ErrorBoundary>
        <BookmarksProvider>
          <div className="space-y-10">
            {/* Header skeleton */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-slate-700 animate-pulse mb-2" />
                <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-28 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>

            {/* Main content skeleton */}
            <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
              {/* Sidebar skeleton */}
              <div className="hidden lg:block">
                <div className="space-y-3">
                  <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-9 w-full rounded bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bookmark list skeleton */}
              <div className="min-w-0 space-y-6">
                {/* Mobile space selector skeleton */}
                <div className="flex items-center justify-between gap-3 lg:hidden">
                  <div className="min-w-0">
                    <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-slate-700 animate-pulse mb-1" />
                    <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <div className="h-9 w-20 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                </div>

                {/* BookmarkToolbar skeleton - search/filter bar */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="h-10 flex-1 min-w-[200px] rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-10 w-24 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse hidden sm:block" />
                    <div className="h-10 w-28 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                  {/* Filter chips skeleton */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="h-7 w-24 rounded-full bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-7 w-20 rounded-full bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-7 w-16 rounded-full bg-zinc-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>

                {/* Bookmark cards skeleton */}
                <BookmarkListSkeleton count={6} />
              </div>
            </div>
          </div>
        </BookmarksProvider>
      </ErrorBoundary>
    );
  }

  // Show unlock screen ONLY if:
  // 1. User is signed in
  // 2. Vault is initialized for this user (currentUserId is set)
  // 3. User has an envelope (E2E is enabled)
  // 4. Vault is not yet unlocked
  if (isSignedIn && currentUserId && vaultEnvelope && !isUnlocked) {
    return <UnlockScreen />;
  }

  return (
    <ErrorBoundary>
      <BookmarksProvider>
        <div className="space-y-10">
          {/* Onboarding Panel - shows for first-time users */}
          <OnboardingPanel />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your personal vault</p>
              <h2 className="text-2xl font-semibold">Manage your bookmarks</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={openForm}>Add bookmark</Button>
              <Button
                variant="secondary"
                onClick={openImportExport}
                aria-label="Import or export bookmarks"
              >
                <ImportExportIcon />
              </Button>
              {/* Keyboard Shortcuts Help */}
              <KeyboardShortcutsHelp position="bottom" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <div className="hidden lg:block">
              <SpacesSidebar />
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 lg:hidden">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Space</p>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {spacesLabel}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={openSpaces}
                >
                  Spaces
                </Button>
              </div>

              <BookmarkFormModal
                titleInputRef={titleInputRef}
              />
              <ImportExportModal />
              <BookmarkList
                cardsContainerRef={cardsContainerRef}
                onAddBookmark={openForm}
              />
            </div>
          </div>

          <BottomSheet className="max-h-[80vh] overflow-auto">
            <SpacesSidebar className="w-full" />
          </BottomSheet>
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
