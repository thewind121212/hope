import { useCallback, useRef, useState } from "react";
import { BookmarkSchema } from "@/lib/validation";
import { Bookmark } from "@/lib/types";

export type ImportMode = "merge" | "replace";
export type DuplicateStrategy = "skip" | "keep";

interface ImportState {
  imported: Bookmark[];
  preview: Bookmark[];
  totalCount: number;
  invalidCount: number;
  mode: ImportMode;
  duplicateStrategy: DuplicateStrategy;
  message: string | null;
  error: string | null;
  isImporting: boolean;
}

interface ImportResultInfo {
  bookmarks: Bookmark[];
  skipped: number;
  duplicates: number;
}

const normalizeUrl = (url: string) => url.trim().toLowerCase();

const parseBookmarks = (text: string) => {
  if (!text.trim()) {
    return { error: "The selected file is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "Invalid JSON file." };
  }

  if (!Array.isArray(parsed)) {
    return { error: "JSON must be an array of bookmarks." };
  }

  const valid: Bookmark[] = [];
  let invalidCount = 0;

  parsed.forEach((item) => {
    const result = BookmarkSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalidCount += 1;
    }
  });

  if (valid.length === 0) {
    return { error: "No valid bookmarks found." };
  }

  return { bookmarks: valid, invalidCount };
};

const dedupeBookmarks = (bookmarks: Bookmark[]) => {
  const seen = new Set<string>();
  const unique: Bookmark[] = [];
  let duplicates = 0;

  bookmarks.forEach((bookmark) => {
    const key = normalizeUrl(bookmark.url);
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    unique.push(bookmark);
  });

  return { bookmarks: unique, skipped: duplicates, duplicates };
};

const mergeBookmarks = (
  existing: Bookmark[],
  incoming: Bookmark[],
  strategy: DuplicateStrategy
) => {
  const merged = [...existing];
  const seen = new Set(existing.map((bookmark) => normalizeUrl(bookmark.url)));
  let skipped = 0;
  let duplicates = 0;

  incoming.forEach((bookmark) => {
    const key = normalizeUrl(bookmark.url);
    const isDuplicate = seen.has(key);
    if (isDuplicate) {
      duplicates += 1;
      if (strategy === "skip") {
        skipped += 1;
        return;
      }
    }
    merged.push(bookmark);
    seen.add(key);
  });

  return { bookmarks: merged, skipped, duplicates };
};

const buildImportResult = (
  existing: Bookmark[],
  incoming: Bookmark[],
  mode: ImportMode,
  strategy: DuplicateStrategy
): ImportResultInfo => {
  if (mode === "replace") {
    return dedupeBookmarks(incoming);
  }

  return mergeBookmarks(existing, incoming, strategy);
};

export function useImportBookmarks(
  existingBookmarks: Bookmark[],
  onImport: (bookmarks: Bookmark[]) => Promise<{ success: boolean; error?: string }>
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({
    imported: [],
    preview: [],
    totalCount: 0,
    invalidCount: 0,
    mode: "merge",
    duplicateStrategy: "skip",
    message: null,
    error: null,
    isImporting: false,
  });

  const resetStatus = useCallback(() => {
    setState((prev) => ({ ...prev, message: null, error: null }));
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      resetStatus();

      const result = parseBookmarks(await file.text());
      if (result.error) {
        setState((prev) => ({
          ...prev,
          error: result.error,
          imported: [],
          preview: [],
          totalCount: 0,
          invalidCount: 0,
        }));
        return;
      }

      const bookmarks = result.bookmarks ?? [];
      setState((prev) => ({
        ...prev,
        imported: bookmarks,
        preview: bookmarks.slice(0, 10),
        totalCount: bookmarks.length,
        invalidCount: result.invalidCount ?? 0,
      }));
    },
    [resetStatus]
  );

  const handleImport = useCallback(async () => {
    if (state.imported.length === 0) return;
    resetStatus();

    const finalResult = buildImportResult(
      existingBookmarks,
      state.imported,
      state.mode,
      state.duplicateStrategy
    );

    const confirmMessage =
      state.mode === "replace"
        ? `Replace existing bookmarks with ${finalResult.bookmarks.length} items?`
        : `Import ${finalResult.bookmarks.length} bookmarks into your list?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setState((prev) => ({ ...prev, isImporting: true }));
    const result = await onImport(finalResult.bookmarks);
    setState((prev) => ({ ...prev, isImporting: false }));

    if (!result.success) {
      setState((prev) => ({ ...prev, error: result.error ?? "Import failed." }));
      return;
    }

    setState((prev) => ({
      ...prev,
      message: `Imported ${finalResult.bookmarks.length} bookmarks. Skipped ${finalResult.skipped} duplicates. Invalid ${prev.invalidCount}. Duplicates found ${finalResult.duplicates}.`,
      imported: [],
      preview: [],
      totalCount: 0,
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [
    existingBookmarks,
    onImport,
    resetStatus,
    state.duplicateStrategy,
    state.imported,
    state.mode,
  ]);

  const setMode = useCallback((mode: ImportMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setDuplicateStrategy = useCallback((strategy: DuplicateStrategy) => {
    setState((prev) => ({ ...prev, duplicateStrategy: strategy }));
  }, []);

  return {
    fileInputRef,
    state,
    handleFileSelect,
    handleImport,
    setMode,
    setDuplicateStrategy,
  };
}
