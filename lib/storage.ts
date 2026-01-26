import { v4 as uuidv4 } from 'uuid';
import { Bookmark } from '@voc/lib/types';
import { calculateCombinedChecksum } from '@/lib/checksum';

const STORAGE_KEY = 'bookmark-vault-bookmarks';
const STORAGE_VERSION = 1;
const PREVIEW_CACHE_KEY = 'bookmark-vault-previews';
const PREVIEW_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CHECKSUM_META_KEY = 'bookmark-vault-checksum-meta';

// ============================================================================
// IN-MEMORY CACHE TO AVOID REPEATED LOCALSTORAGE PARSING
// ============================================================================
// Cache bookmarks array in memory to prevent repeated JSON.parse calls
// on every bookmark operation. Cache is invalidated when data is written
// to localStorage or when another tab modifies storage.
let bookmarkCache: Bookmark[] | null = null;

export function invalidateBookmarkCache(): void {
  bookmarkCache = null;
}

/**
 * Test-only utility to reset the bookmark cache.
 * Used by test setup to ensure no stale cache between tests.
 */
export function __resetCacheForTesting(): void {
  bookmarkCache = null;
}

export function invalidateAllCaches(): void {
  bookmarkCache = null;

  // Invalidate space and view caches (lazy imports to avoid circular dependencies)
  // These must be imported at call time, not module load time
  try {
    // Dynamic imports avoid circular dependency issues
    // Caches are invalidated best-effort: if either import fails, we still invalidated bookmarks
    Promise.all([
      import('@/lib/spacesStorage').then(m => {
        if (m.invalidateSpaceCache) {
          m.invalidateSpaceCache();
        }
      }).catch(() => {
        // Ignore import errors
      }),
      import('@/lib/pinnedViewsStorage').then(m => {
        if (m.invalidateViewCache) {
          m.invalidateViewCache();
        }
      }).catch(() => {
        // Ignore import errors
      }),
    ]).catch(() => {
      // Ignore any errors from Promise.all
    });
  } catch {
    // Ignore
  }
}

type StoredBookmarks = {
  version: number;
  data: Bookmark[];
};

// Flag to skip checksum recalculation (e.g., during pull where we use server's checksum)
let skipChecksumRecalculation = false;

export function setSkipChecksumRecalculation(skip: boolean): void {
  skipChecksumRecalculation = skip;
}

// One-time cleanup: remove old redundant checksum key
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('bookmark-vault-checksum');
  } catch {
    // Ignore
  }
}

const parseBookmarks = (raw: string | null): Bookmark[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Bookmark[];
    }
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      const data = (parsed as StoredBookmarks).data;
      return Array.isArray(data) ? data : [];
    }
  } catch {
    return [];
  }
  return [];
};

const loadBookmarks = (): Bookmark[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  // Return cached bookmarks if available
  if (bookmarkCache !== null) {
    // Return a COPY to prevent mutations of cached array
    return Array.from(bookmarkCache);
  }

  // Parse from localStorage and cache the result
  const parsed = parseBookmarks(localStorage.getItem(STORAGE_KEY));
  bookmarkCache = parsed;
  // Return a COPY to prevent mutations of cached array
  return Array.from(parsed);
};

const saveBookmarks = (bookmarks: Bookmark[]): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const payload: StoredBookmarks = {
      version: STORAGE_VERSION,
      data: bookmarks,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Store a COPY in cache, not the caller's reference (defensive against mutations)
    bookmarkCache = Array.from(bookmarks);
    return true;
  } catch {
    return false;
  }
};

export function getBookmarks(): Bookmark[] {
  return loadBookmarks();
}

export function addBookmark(
  bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>
): Bookmark {
  const now = new Date().toISOString();
  const newBookmark: Bookmark = {
    ...bookmark,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,  // Set updatedAt for new bookmarks
  };

  const bookmarks = loadBookmarks();
  saveBookmarks([...bookmarks, newBookmark]);

  // Debounced checksum update (batches rapid operations)
  debouncedRecalculateChecksum();

  return newBookmark;
}

export function deleteBookmark(id: string): void {
  const bookmarks = loadBookmarks();
  const filtered = bookmarks.filter((b) => b.id !== id);
  saveBookmarks(filtered);

  // Debounced checksum update (batches rapid operations)
  debouncedRecalculateChecksum();
}

export function deleteBookmarks(ids: string[]): void {
  const bookmarks = loadBookmarks();
  const filtered = bookmarks.filter((b) => !ids.includes(b.id));
  saveBookmarks(filtered);

  // Debounced checksum update (batches rapid operations)
  debouncedRecalculateChecksum();
}

export function updateBookmark(bookmark: Bookmark): Bookmark | null {
  const bookmarks = loadBookmarks();
  const updated = bookmarks.map((item) =>
    item.id === bookmark.id ? bookmark : item
  );
  const saved = saveBookmarks(updated);

  // Debounced checksum update (batches rapid operations)
  debouncedRecalculateChecksum();

  return saved ? bookmark : null;
}

export function setBookmarks(bookmarks: Bookmark[]): boolean {
  const saved = saveBookmarks(bookmarks);

  // Debounced checksum update (batches rapid operations)
  debouncedRecalculateChecksum();

  return saved;
}

export function searchBookmarks(query: string): Bookmark[] {
  const bookmarks = getBookmarks();
  const lowerQuery = query.toLowerCase();

  return bookmarks.filter((bookmark) => {
    const titleMatch = bookmark.title.toLowerCase().includes(lowerQuery);
    const urlMatch = bookmark.url.toLowerCase().includes(lowerQuery);
    const descriptionMatch = bookmark.description
      ?.toLowerCase()
      .includes(lowerQuery);
    const tagsMatch = bookmark.tags.some((tag) =>
      tag.toLowerCase().includes(lowerQuery)
    );

    return titleMatch || urlMatch || descriptionMatch || tagsMatch;
  });
}

export type BookmarkPreview = NonNullable<Bookmark['preview']>;

interface StoredPreviews {
  [bookmarkId: string]: BookmarkPreview & { _fetchedAt: number };
}

function getPreviewCache(): StoredPreviews {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PREVIEW_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredPreviews;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function savePreviewCache(cache: StoredPreviews): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full, ignore
  }
}

export function getPreview(bookmarkId: string): BookmarkPreview | null {
  const cache = getPreviewCache();
  const preview = cache[bookmarkId];
  if (!preview) return null;

  const isStale = Date.now() - preview._fetchedAt > PREVIEW_TTL;
  if (isStale) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _fetchedAt, ...result } = preview;
  return result;
}

export function savePreview(bookmarkId: string, preview: BookmarkPreview): void {
  const cache = getPreviewCache();
  cache[bookmarkId] = { ...preview, _fetchedAt: Date.now() };
  savePreviewCache(cache);
}

export function deletePreview(bookmarkId: string): void {
  const cache = getPreviewCache();
  delete cache[bookmarkId];
  savePreviewCache(cache);
}

export function clearStalePreviews(): void {
  const cache = getPreviewCache();
  const cleaned: StoredPreviews = {};
  for (const [id, preview] of Object.entries(cache)) {
    if (Date.now() - preview._fetchedAt <= PREVIEW_TTL) {
      cleaned[id] = preview;
    }
  }
  savePreviewCache(cleaned);
}

// ============================================================================
// DEBOUNCE UTILITY FOR CHECKSUM RECALCULATION
// ============================================================================

/**
 * Simple debounce implementation for checksum recalculation.
 * 500ms debounce time is shorter than sync debounce (2s), ensuring checksums
 * are fresh before sync happens. If app crashes before debounce runs, checksum
 * will be stale but derivable from data (eventual consistency is acceptable).
 */
function createDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  }) as T;
}

// ============================================================================
// CHECKSUM STORAGE
// ============================================================================

export interface ChecksumMeta {
  checksum: string;
  count: number;
  lastUpdate: string | null;
  perTypeCounts: {
    bookmarks: number;
    spaces: number;
    pinnedViews: number;
  };
}

export function getStoredChecksumMeta(): ChecksumMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHECKSUM_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChecksumMeta;
  } catch {
    return null;
  }
}

export function saveChecksumMeta(meta: ChecksumMeta): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(CHECKSUM_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function clearChecksum(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CHECKSUM_META_KEY);
  // Also clean up old redundant key if it exists
  localStorage.removeItem('bookmark-vault-checksum');
}

/**
 * Recalculate and save the combined checksum for all local data.
 * This should be called whenever local data changes (bookmarks, spaces, or pinned views).
 */
export async function recalculateAndSaveChecksum(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Skip if flag is set (e.g., during pull where we use server's checksum)
  if (skipChecksumRecalculation) {
    return;
  }

  try {
    // Get all local data
    const bookmarks = getBookmarks();

    // Import these dynamically to avoid circular dependencies
    // If imports fail, use empty fallback to prevent complete failure
    let spaces: unknown[] = [];
    let pinnedViews: unknown[] = [];

    try {
      const spacesModule = await import('@/lib/spacesStorage');
      if (spacesModule.getSpaces) {
        spaces = spacesModule.getSpaces();
      }
    } catch (error) {
      console.warn('Failed to import spacesStorage, using empty fallback:', error);
      spaces = [];
    }

    try {
      const viewsModule = await import('@/lib/pinnedViewsStorage');
      if (viewsModule.getPinnedViews) {
        pinnedViews = viewsModule.getPinnedViews();
      }
    } catch (error) {
      console.warn('Failed to import pinnedViewsStorage, using empty fallback:', error);
      pinnedViews = [];
    }

    // Calculate combined checksum (with fallback data if imports failed)
    const checksum = await calculateCombinedChecksum(
      bookmarks,
      spaces,
      pinnedViews
    );

    // Calculate the maximum updatedAt from all records (for proper sync comparison)
    const allRecords = [
      ...bookmarks.map(b => b.updatedAt),
      ...(Array.isArray(spaces) ? spaces.filter(s => s && typeof s === 'object' && 'updatedAt' in s).map((s: any) => s.updatedAt) : []),
      ...(Array.isArray(pinnedViews) ? pinnedViews.filter(v => v && typeof v === 'object' && 'updatedAt' in v).map((v: any) => v.updatedAt) : []),
    ].filter((dt): dt is string => dt !== undefined);

    const maxUpdatedAt = allRecords.length > 0
      ? new Date(Math.max(...allRecords.map(d => new Date(d).getTime()))).toISOString()
      : new Date().toISOString();

    // Save checksum metadata
    saveChecksumMeta({
      checksum,
      count: bookmarks.length + spaces.length + pinnedViews.length,
      lastUpdate: maxUpdatedAt,  // Use actual max record updatedAt, not now()
      perTypeCounts: {
        bookmarks: bookmarks.length,
        spaces: spaces.length,
        pinnedViews: pinnedViews.length,
      },
    });
  } catch (error) {
    console.error('Failed to recalculate checksum, will retry on next operation:', error);
    // Silently fail - checksum will be recalculated on next CRUD operation
  }
}

/**
 * Debounced checksum recalculation (500ms).
 * Batches rapid operations (add/edit/delete) into a single checksum calculation.
 * 500ms debounce is shorter than sync debounce (2s), ensuring checksums are fresh before sync.
 * Fire-and-forget: don't await the result, data is already written to localStorage.
 */
const debouncedRecalculateChecksum = createDebounce(() => {
  recalculateAndSaveChecksum();
}, 500);

/**
 * Export debounced checksum recalculation for use across storage modules.
 * Use this instead of calling recalculateAndSaveChecksum() directly for CRUD operations.
 */
export function debouncedRecalculateChecksumExport(): void {
  debouncedRecalculateChecksum();
}
