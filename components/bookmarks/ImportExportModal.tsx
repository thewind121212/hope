"use client";

import { useRef, useMemo, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import ImportPreview from "@/components/ImportPreview";
import { useBookmarks } from "@/hooks/useBookmarks";
import {
  useImportBookmarks,
  type DuplicateStrategy,
  type ImportMode,
} from "@/hooks/useImportBookmarks";
import { getBookmarks } from "@/lib/storage";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportExportModal({
  isOpen,
  onClose,
}: ImportExportModalProps) {
  const { allBookmarks, importBookmarks } = useBookmarks();
  const {
    fileInputRef,
    state,
    handleFileSelect,
    handleImport,
    setMode,
    setDuplicateStrategy,
  } = useImportBookmarks(allBookmarks, importBookmarks);

  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const hasPreview = state.imported.length > 0;

  // Calculate stats
  const stats = useMemo(() => {
    const tags = new Set<string>();
    const withColors = allBookmarks.filter((b) => b.color).length;
    const withDescriptions = allBookmarks.filter((b) => b.description).length;

    allBookmarks.forEach((bookmark) => {
      bookmark.tags.forEach((tag) => tags.add(tag));
    });

    return {
      total: allBookmarks.length,
      uniqueTags: tags.size,
      withColors,
      withDescriptions,
    };
  }, [allBookmarks]);

  const handleExport = () => {
    const bookmarks = getBookmarks();
    const json = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmarks-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImportClick = () => {
    if (state.mode === "replace" && allBookmarks.length > 0) {
      // Show confirmation for replace mode
      setShowReplaceConfirm(true);
    } else {
      handleImport();
    }
  };

  const handleConfirmReplace = () => {
    setShowReplaceConfirm(false);
    handleImport();
  };

  const handleModeChange = (newMode: ImportMode) => {
    setMode(newMode);
    // Reset replace confirm when mode changes
    setShowReplaceConfirm(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Manage Data">
        <div className="space-y-6">
          {/* Stats Section */}
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
              Your Bookmarks
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.total}</span>
                <span className="text-slate-600 dark:text-slate-400 ml-1">total</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.uniqueTags}</span>
                <span className="text-slate-600 dark:text-slate-400 ml-1">tags</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.withColors}</span>
                <span className="text-slate-600 dark:text-slate-400 ml-1">colored</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.withDescriptions}</span>
                <span className="text-slate-600 dark:text-slate-400 ml-1">described</span>
              </div>
            </div>
          </section>

          {/* Export Section */}
          <section className="space-y-2">
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Export Bookmarks
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Download all your bookmarks as a JSON file.
            </p>
            <Button variant="secondary" onClick={handleExport}>
              <DownloadIcon />
              Export JSON
            </Button>
          </section>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Import Section */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Import Bookmarks
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upload a JSON file to import bookmarks.
            </p>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="sr-only"
              aria-label="Select JSON file to import"
            />

            <Button variant="secondary" onClick={triggerFileSelect}>
              <UploadIcon />
              Choose File
            </Button>

            {hasPreview && (
              <div className="space-y-3">
                <ImportPreview
                  bookmarks={state.preview}
                  totalCount={state.totalCount}
                  invalidCount={state.invalidCount}
                />

                {/* Import options */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Mode
                    </legend>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <input
                        type="radio"
                        name="import-mode"
                        value="merge"
                        checked={state.mode === "merge"}
                        onChange={() => handleModeChange("merge" as ImportMode)}
                        className="accent-rose-600"
                      />
                      Merge
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <input
                        type="radio"
                        name="import-mode"
                        value="replace"
                        checked={state.mode === "replace"}
                        onChange={() => handleModeChange("replace" as ImportMode)}
                        className="accent-rose-600"
                      />
                      Replace
                    </label>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duplicates
                    </legend>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <input
                        type="radio"
                        name="duplicate-strategy"
                        value="skip"
                        checked={state.duplicateStrategy === "skip"}
                        onChange={() =>
                          setDuplicateStrategy("skip" as DuplicateStrategy)
                        }
                        disabled={state.mode === "replace"}
                        className="accent-rose-600"
                      />
                      Skip
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <input
                        type="radio"
                        name="duplicate-strategy"
                        value="keep"
                        checked={state.duplicateStrategy === "keep"}
                        onChange={() =>
                          setDuplicateStrategy("keep" as DuplicateStrategy)
                        }
                        disabled={state.mode === "replace"}
                        className="accent-rose-600"
                      />
                      Keep
                    </label>
                  </fieldset>
                </div>

                <Button
                  onClick={handleImportClick}
                  disabled={state.isImporting}
                  className="w-full sm:w-auto"
                >
                  {state.isImporting ? "Importing..." : "Import Bookmarks"}
                </Button>

                {/* Warning for replace mode */}
                {state.mode === "replace" && allBookmarks.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Warning: Replace mode will delete all existing bookmarks.
                  </p>
                )}
              </div>
            )}

            {state.message && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {state.message}
              </p>
            )}
            {state.error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {state.error}
              </p>
            )}
          </section>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Replace Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showReplaceConfirm}
        onClose={() => setShowReplaceConfirm(false)}
        onConfirm={handleConfirmReplace}
        title="Replace All Bookmarks?"
        description={`This will permanently delete your ${allBookmarks.length} existing bookmark${allBookmarks.length !== 1 ? 's' : ''} and replace them with ${state.totalCount} new bookmark${state.totalCount !== 1 ? 's' : ''}. This action cannot be undone.`}
        confirmLabel="Yes, Replace All"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}

/* Simple SVG icons */
function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
