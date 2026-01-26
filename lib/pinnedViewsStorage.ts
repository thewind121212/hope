import { v4 as uuidv4 } from "uuid";
import type { PinnedView } from "@voc/lib/types";
import { debouncedRecalculateChecksumExport } from "@/lib/storage";

const PINNED_VIEWS_KEY = "bookmark-vault-pinned-views";

// ============================================================================
// IN-MEMORY CACHE TO AVOID REPEATED LOCALSTORAGE PARSING
// ============================================================================
let viewCache: PinnedView[] | null = null;

export function invalidateViewCache(): void {
  viewCache = null;
}

function safeParsePinnedViews(raw: string | null): PinnedView[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is PinnedView => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as PinnedView;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.spaceId === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.searchQuery === "string" &&
        typeof candidate.tag === "string" &&
        typeof candidate.sortKey === "string" &&
        typeof candidate.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function loadPinnedViews(): PinnedView[] {
  if (typeof window === "undefined") return [];

  // Return cached views if available
  if (viewCache !== null) {
    // Return a COPY to prevent mutations of cached array
    return Array.from(viewCache);
  }

  // Parse from localStorage and cache the result
  const parsed = safeParsePinnedViews(localStorage.getItem(PINNED_VIEWS_KEY));
  viewCache = parsed;
  // Return a COPY to prevent mutations of cached array
  return Array.from(parsed);
}

export function savePinnedViews(views: PinnedView[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(PINNED_VIEWS_KEY, JSON.stringify(views));
    // Store a COPY in cache, not the caller's reference (defensive against mutations)
    viewCache = Array.from(views);
    // Debounced checksum update (batches rapid operations)
    debouncedRecalculateChecksumExport();
    return true;
  } catch {
    return false;
  }
}

export function getPinnedViews(spaceId?: string): PinnedView[] {
  const all = loadPinnedViews();
  if (!spaceId) return all;
  return all.filter((view) => view.spaceId === spaceId);
}

export function addPinnedView(input: {
  spaceId: string;
  name: string;
  searchQuery?: string;
  tag?: string;
  sortKey?: PinnedView["sortKey"];
}): PinnedView {
  const view: PinnedView = {
    id: uuidv4(),
    spaceId: input.spaceId,
    name: input.name.trim(),
    searchQuery: input.searchQuery ?? "",
    tag: input.tag ?? "all",
    sortKey: input.sortKey ?? "newest",
    createdAt: new Date().toISOString(),
  };

  const existing = loadPinnedViews();
  savePinnedViews([...existing, view]);
  return view;
}

export function deletePinnedView(id: string): boolean {
  const existing = loadPinnedViews();
  const filtered = existing.filter((view) => view.id !== id);
  return savePinnedViews(filtered);
}

export function updatePinnedView(next: PinnedView): PinnedView | null {
  const existing = loadPinnedViews();
  const updated = existing.map((view) => (view.id === next.id ? next : view));
  const saved = savePinnedViews(updated);
  return saved ? next : null;
}

// ============================================================================
// TEST UTILITIES
// ============================================================================
export function __resetCacheForTesting(): void {
  viewCache = null;
}
