"use client";

import { useMemo, useState } from "react";
import { Download, Upload, FileJson, AlertTriangle } from "lucide-react";
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
import { useUiStore } from "@/stores/useUiStore";
import { cn } from "@/lib/utils";

function SegmentButton({
  active,
  disabled,
  children,
  onClick,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-rose-500 text-white shadow-sm"
          : "text-slate-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      {children}
    </div>
  );
}

export default function ImportExportModal() {
  const isOpen = useUiStore((s) => s.isImportExportOpen);
  const closeImportExport = useUiStore((s) => s.closeImportExport);

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

  const stats = useMemo(() => {
    const tags = new Set<string>();
    allBookmarks.forEach((b) => b.tags.forEach((t) => tags.add(t)));
    return { total: allBookmarks.length, tags: tags.size };
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

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleImportClick = () => {
    if (state.mode === "replace" && allBookmarks.length > 0) {
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
    setShowReplaceConfirm(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={closeImportExport} title="Backup & restore">
        <div className="space-y-5">
          {/* Quick stats banner */}
          <div className="flex items-center justify-between rounded-lg bg-rose-50 px-4 py-3 dark:bg-rose-500/10">
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <FileJson className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {stats.total}
                </span>{" "}
                bookmark{stats.total === 1 ? "" : "s"}{" "}
                <span className="text-slate-500 dark:text-slate-400">
                  · {stats.tags} tag{stats.tags === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {/* Export */}
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Export
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Save every bookmark to a JSON file you can restore later.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={stats.total === 0}
                className="shrink-0"
              >
                Download
              </Button>
            </div>
          </section>

          {/* Import */}
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Import
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Drop in a JSON file. Merge with what you have, or wipe and replace.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={triggerFileSelect}
                className="shrink-0"
              >
                Pick file
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="sr-only"
              aria-label="Select JSON file to import"
            />

            {hasPreview && (
              <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4 dark:border-slate-800">
                <ImportPreview
                  bookmarks={state.preview}
                  totalCount={state.totalCount}
                  invalidCount={state.invalidCount}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Mode
                    </p>
                    <Segmented>
                      <SegmentButton
                        active={state.mode === "merge"}
                        onClick={() => handleModeChange("merge" as ImportMode)}
                      >
                        Merge
                      </SegmentButton>
                      <SegmentButton
                        active={state.mode === "replace"}
                        onClick={() => handleModeChange("replace" as ImportMode)}
                      >
                        Replace
                      </SegmentButton>
                    </Segmented>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Duplicates
                    </p>
                    <Segmented>
                      <SegmentButton
                        active={state.duplicateStrategy === "skip"}
                        disabled={state.mode === "replace"}
                        onClick={() =>
                          setDuplicateStrategy("skip" as DuplicateStrategy)
                        }
                        title="Skip URLs you already have"
                      >
                        Skip
                      </SegmentButton>
                      <SegmentButton
                        active={state.duplicateStrategy === "keep"}
                        disabled={state.mode === "replace"}
                        onClick={() =>
                          setDuplicateStrategy("keep" as DuplicateStrategy)
                        }
                        title="Keep both copies"
                      >
                        Keep both
                      </SegmentButton>
                    </Segmented>
                  </div>
                </div>

                {state.mode === "replace" && allBookmarks.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Replace deletes all {allBookmarks.length} current bookmark
                      {allBookmarks.length === 1 ? "" : "s"}.
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleImportClick}
                  disabled={state.isImporting}
                  className="w-full sm:w-auto"
                >
                  {state.isImporting
                    ? "Importing…"
                    : `Import ${state.totalCount} bookmark${state.totalCount === 1 ? "" : "s"}`}
                </Button>
              </div>
            )}

            {state.message && (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                {state.message}
              </p>
            )}
            {state.error && (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                {state.error}
              </p>
            )}
          </section>

          <div className="flex justify-end pt-1">
            <Button variant="ghost" onClick={closeImportExport}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showReplaceConfirm}
        onClose={() => setShowReplaceConfirm(false)}
        onConfirm={handleConfirmReplace}
        title="Replace all bookmarks?"
        description={`Deletes your ${allBookmarks.length} bookmark${allBookmarks.length === 1 ? "" : "s"} and replaces with ${state.totalCount} new one${state.totalCount === 1 ? "" : "s"}. Cannot be undone.`}
        confirmLabel="Replace all"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}
