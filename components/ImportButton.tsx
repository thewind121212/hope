"use client";

import { useBookmarks } from "@/hooks/useBookmarks";
import {
  useImportBookmarks,
  type DuplicateStrategy,
  type ImportMode,
} from "@/hooks/useImportBookmarks";
import ImportPreview from "@/components/ImportPreview";

export default function ImportButton() {
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1 file:text-sm file:text-gray-700 hover:file:bg-gray-50"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!hasPreview || state.isImporting}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.isImporting ? "Importing..." : "Import"}
        </button>
      </div>

      {hasPreview && (
        <div className="space-y-3">
          <ImportPreview
            bookmarks={state.preview}
            totalCount={state.totalCount}
            invalidCount={state.invalidCount}
          />
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={state.mode === "merge"}
                onChange={() => setMode("merge" as ImportMode)}
              />
              Merge
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={state.mode === "replace"}
                onChange={() => setMode("replace" as ImportMode)}
              />
              Replace
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="duplicate-strategy"
                value="skip"
                checked={state.duplicateStrategy === "skip"}
                onChange={() => setDuplicateStrategy("skip" as DuplicateStrategy)}
                disabled={state.mode === "replace"}
              />
              Skip duplicates
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="duplicate-strategy"
                value="keep"
                checked={state.duplicateStrategy === "keep"}
                onChange={() => setDuplicateStrategy("keep" as DuplicateStrategy)}
                disabled={state.mode === "replace"}
              />
              Keep duplicates
            </label>
          </div>
        </div>
      )}

      {state.message && <p className="text-sm text-green-600">{state.message}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
