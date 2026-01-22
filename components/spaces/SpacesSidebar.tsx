"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Dashboard } from "@/components/bookmarks/Dashboard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SpaceFormModal from "@/components/spaces/SpaceFormModal";
import PinnedViewFormModal from "@/components/spaces/PinnedViewFormModal";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSpaces } from "@/hooks/useSpaces";
import { cn } from "@/lib/utils";
import {
  PERSONAL_SPACE_ID,
  getSpaces,
} from "@/lib/spacesStorage";
import { usePinnedViews } from "@/hooks/usePinnedViews";
import type { PinnedView, Space } from "@/lib/types";
import { useUiStore } from "@/stores/useUiStore";

export type SpaceSelection = "all" | string;

interface SpacesSidebarProps {
  className?: string;
}

function SpacesSidebarSkeleton({ className }: { className?: string }) {
  return (
    <aside className={cn("w-full lg:w-72", className)}>
      <div className="space-y-4 animate-pulse">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-slate-800" />
            <div className="h-8 w-16 rounded bg-zinc-200 dark:bg-slate-800" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-9 rounded bg-zinc-200 dark:bg-slate-800" />
            <div className="h-9 rounded bg-zinc-200 dark:bg-slate-800" />
            <div className="h-9 rounded bg-zinc-200 dark:bg-slate-800" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-slate-800" />
            <div className="h-8 w-16 rounded bg-zinc-200 dark:bg-slate-800" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-10 rounded bg-zinc-200 dark:bg-slate-800" />
            <div className="h-10 rounded bg-zinc-200 dark:bg-slate-800" />
          </div>
        </Card>
      </div>
    </aside>
  );
}

function SpacesSidebar({ className }: SpacesSidebarProps) {
  // Read from store
  const selectedSpaceId = useUiStore((s) => s.selectedSpaceId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const selectedTag = useUiStore((s) => s.selectedTag);
  const sortKey = useUiStore((s) => s.sortKey);

  // Store actions
  const setSelectedSpaceId = useUiStore((s) => s.setSelectedSpaceId);
  const applyPinnedView = useUiStore((s) => s.applyPinnedView);
  const closeSpaces = useUiStore((s) => s.closeSpaces);

  const [isHydrated, setIsHydrated] = useState(false);

  const [spacesVersion, setSpacesVersion] = useState(0);

  const [spaces, setSpaces] = useState<Space[]>([]);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isSpaceFormOpen, setIsSpaceFormOpen] = useState(false);
  const [spaceFormMode, setSpaceFormMode] = useState<"create" | "edit">("create");
  const [spaceFormTarget, setSpaceFormTarget] = useState<Space | null>(null);

  const [isPinnedViewFormOpen, setIsPinnedViewFormOpen] = useState(false);

  const { allBookmarks, moveBookmarksToSpace } = useBookmarks();
  const { addSpace, updateSpace, deleteSpace } = useSpaces();
  const { pinnedViews: allPinnedViews, addPinnedView, deletePinnedView, getPinnedViewsForSpace } = usePinnedViews();

  // Filter pinned views by selected space - uses context which auto-refreshes on sync
  const pinnedViews = useMemo(() => {
    if (selectedSpaceId === "all") {
      // When "All spaces" is selected, show ALL pinned views across all spaces
      return allPinnedViews;
    }
    return getPinnedViewsForSpace(selectedSpaceId);
  }, [allPinnedViews, selectedSpaceId, getPinnedViewsForSpace]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    setSpaces(getSpaces());
  }, [isHydrated, spacesVersion]);

  const bookmarkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bookmark of allBookmarks) {
      const spaceId = bookmark.spaceId ?? PERSONAL_SPACE_ID;
      counts.set(spaceId, (counts.get(spaceId) ?? 0) + 1);
    }
    return counts;
  }, [allBookmarks]);

  const deleteTarget = useMemo(
    () => (deleteTargetId ? spaces.find((s) => s.id === deleteTargetId) ?? null : null),
    [deleteTargetId, spaces]
  );

  const handleSelectSpaceId = (spaceId: SpaceSelection) => {
    setSelectedSpaceId(spaceId);
    // Auto-close on selection for mobile UX
    closeSpaces();
  };

  const handleAddSpace = () => {
    setSpaceFormMode("create");
    setSpaceFormTarget(null);
    setIsSpaceFormOpen(true);
  };

  const handleRenameSpace = (spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId) ?? null;
    if (!space || space.id === PERSONAL_SPACE_ID) return;

    setSpaceFormMode("edit");
    setSpaceFormTarget(space);
    setIsSpaceFormOpen(true);
  };

  const handleSubmitSpaceForm = ({ name }: { name: string }) => {
    if (spaceFormMode === "create") {
      const created = addSpace({ name });
      setSpacesVersion((v) => v + 1);
      setSelectedSpaceId(created.id);
      return;
    }

    if (!spaceFormTarget) return;
    updateSpace({ ...spaceFormTarget, name });
    setSpacesVersion((v) => v + 1);
  };

  const requestDeleteSpace = (spaceId: string) => {
    if (spaceId === PERSONAL_SPACE_ID) {
      window.alert("Personal space cannot be deleted.");
      return;
    }
    setDeleteTargetId(spaceId);
  };

  const confirmDeleteSpace = () => {
    if (!deleteTargetId) return;

    const moveResult = moveBookmarksToSpace(deleteTargetId, PERSONAL_SPACE_ID);
    if (!moveResult.success) {
      setDeleteTargetId(null);
      return;
    }

    for (const view of getPinnedViewsForSpace(deleteTargetId)) {
      deletePinnedView(view.id);
    }

    deleteSpace(deleteTargetId);
    setSpacesVersion((v) => v + 1);

    if (selectedSpaceId === deleteTargetId) {
      setSelectedSpaceId("all");
    }

    setDeleteTargetId(null);
  };

  const handleSavePinnedView = () => {
    setIsPinnedViewFormOpen(true);
  };

  const handleSubmitPinnedViewForm = ({ name }: { name: string }) => {
    addPinnedView({
      spaceId: selectedSpaceId,
      name,
      searchQuery,
      tag: selectedTag,
      sortKey,
    });
  };

  const handleDeletePinnedView = (id: string) => {
    deletePinnedView(id);
  };

  if (!isHydrated) {
    return <SpacesSidebarSkeleton className={className} />;
  }

  return (
    <aside
      className={cn(
        "w-full lg:w-72 lg:sticky lg:top-25 lg:self-start",
        className
      )}
    >
      <div className="space-y-4">
        <Dashboard />
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Spaces
            </h3>
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              onClick={handleAddSpace}
            >
              Add
            </Button>
          </div>

          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => handleSelectSpaceId("all")}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedSpaceId === "all"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span>All spaces</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {allBookmarks.length}
                </span>
              </div>
            </button>

            {spaces.map((space) => {
              const count = bookmarkCounts.get(space.id) ?? 0;
              const active = selectedSpaceId === space.id;

              return (
                <div
                  key={space.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                    active
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSpaceId(space.id)}
                    className="min-w-0 text-left text-sm"
                  >
                    <span className="block truncate">{space.name}</span>
                  </button>

                  {space.id !== PERSONAL_SPACE_ID ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRenameSpace(space.id);
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        aria-label={`Rename space ${space.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M4 13.5V16h2.5l7.373-7.373-2.5-2.5L4 13.5z" />
                          <path d="M14.854 2.646a.5.5 0 01.707 0l1.793 1.793a.5.5 0 010 .707l-1.44 1.44-2.5-2.5 1.44-1.44z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          requestDeleteSpace(space.id);
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                        aria-label={`Delete space ${space.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.366-.446.915-.699 1.493-.699h.5c.578 0 1.127.253 1.493.699L12.414 4H16a.75.75 0 010 1.5h-.636l-.621 10.06A2.25 2.25 0 0112.5 17.75h-5A2.25 2.25 0 015.257 15.56L4.636 5.5H4a.75.75 0 010-1.5h3.586l.671-.901zM6.777 5.5l.56 9.06a.75.75 0 00.748.69h5a.75.75 0 00.748-.69l.56-9.06H6.777z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div />
                  )}

                  <span
                    className={cn(
                      "text-xs",
                      active
                        ? "text-rose-600 dark:text-rose-300"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Pinned views
            </h3>
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              onClick={handleSavePinnedView}
            >
              Save
            </Button>
          </div>

          {pinnedViews.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Save your current filters to access them in 1 click.
            </p>
          ) : (
            <div className="mt-3 space-y-1">
              {pinnedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => {
                      applyPinnedView(view);
                      closeSpaces(); // Auto-close for mobile UX
                    }}
                    className="flex-1 px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200"
                  >
                    <div className="font-medium">{view.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {view.tag !== "all" ? `Tag: ${view.tag}` : "All tags"} · {view.sortKey}
                      {view.searchQuery ? ` · "${view.searchQuery}"` : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePinnedView(view.id)}
                    className="mr-1 rounded-md p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    aria-label={`Delete pinned view ${view.name}`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.366-.446.915-.699 1.493-.699h.5c.578 0 1.127.253 1.493.699L12.414 4H16a.75.75 0 010 1.5h-.636l-.621 10.06A2.25 2.25 0 0112.5 17.75h-5A2.25 2.25 0 015.257 15.56L4.636 5.5H4a.75.75 0 010-1.5h3.586l.671-.901zM6.777 5.5l.56 9.06a.75.75 0 00.748.69h5a.75.75 0 00.748-.69l.56-9.06H6.777z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete space "${deleteTarget?.name ?? ""}"? (${bookmarkCounts.get(deleteTargetId ?? "") ?? 0} bookmarks)`}
        description="Bookmarks in this space will be moved to Personal. Pinned views for this space will be removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteSpace}
        onClose={() => setDeleteTargetId(null)}
      />

      <SpaceFormModal
        isOpen={isSpaceFormOpen}
        onClose={() => setIsSpaceFormOpen(false)}
        mode={spaceFormMode}
        initialSpace={spaceFormTarget}
        onSubmit={handleSubmitSpaceForm}
      />

      <PinnedViewFormModal
        isOpen={isPinnedViewFormOpen}
        onClose={() => setIsPinnedViewFormOpen(false)}
        existingNames={pinnedViews.map((v) => v.name)}
        onSubmit={handleSubmitPinnedViewForm}
      />
    </aside>
  );
}

// Apply memo for conservative optimization
export default memo(SpacesSidebar);
