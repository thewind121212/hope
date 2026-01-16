"use client";

import { useRef } from "react";
import { Button, Modal } from "@/components/ui";
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

  const hasPreview = state.imported.length > 0;

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import / Export">
      <div className="space-y-6">
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
                      onChange={() => setMode("merge" as ImportMode)}
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
                      onChange={() => setMode("replace" as ImportMode)}
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
                onClick={handleImport}
                disabled={state.isImporting}
                className="w-full sm:w-auto"
              >
                {state.isImporting ? "Importing..." : "Import Bookmarks"}
              </Button>
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
