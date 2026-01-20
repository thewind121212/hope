import { v4 as uuidv4 } from 'uuid';
import { Bookmark } from '@voc/lib/types';
import { calculateCombinedChecksum } from '@/lib/checksum';

const STORAGE_KEY = 'bookmark-vault-bookmarks';
const STORAGE_VERSION = 1;
const PREVIEW_CACHE_KEY = 'bookmark-vault-previews';
const PREVIEW_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CHECKSUM_KEY = 'bookmark-vault-checksum';
const CHECKSUM_META_KEY = 'bookmark-vault-checksum-meta';

type StoredBookmarks = {
  version: number;
  data: Bookmark[];
};

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
  return parseBookmarks(localStorage.getItem(STORAGE_KEY));
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
    return true;
  } catch {
    return false;
  }
};

export function getBookmarks(): Bookmark[] {
  return loadBookmarks();
}

export function addBookmark(
  bookmark: Omit<Bookmark, 'id' | 'createdAt'>
): Bookmark {
  const newBookmark: Bookmark = {
    ...bookmark,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  const bookmarks = loadBookmarks();
  saveBookmarks([...bookmarks, newBookmark]);

  // Update checksum after adding
  recalculateAndSaveChecksum();

  return newBookmark;
}

export function deleteBookmark(id: string): void {
  const bookmarks = loadBookmarks();
  const filtered = bookmarks.filter((b) => b.id !== id);
  saveBookmarks(filtered);

  // Update checksum after deleting
  recalculateAndSaveChecksum();
}

export function deleteBookmarks(ids: string[]): void {
  const bookmarks = loadBookmarks();
  const filtered = bookmarks.filter((b) => !ids.includes(b.id));
  saveBookmarks(filtered);

  // Update checksum after deleting
  recalculateAndSaveChecksum();
}

export function updateBookmark(bookmark: Bookmark): Bookmark | null {
  const bookmarks = loadBookmarks();
  const updated = bookmarks.map((item) =>
    item.id === bookmark.id ? bookmark : item
  );
  const saved = saveBookmarks(updated);

  // Update checksum after updating
  recalculateAndSaveChecksum();

  return saved ? bookmark : null;
}

export function setBookmarks(bookmarks: Bookmark[]): boolean {
  const saved = saveBookmarks(bookmarks);

  // Update checksum after setting
  recalculateAndSaveChecksum();

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

export function getStoredChecksum(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CHECKSUM_KEY);
  } catch {
    return null;
  }
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
    localStorage.setItem(CHECKSUM_KEY, meta.checksum);
    localStorage.setItem(CHECKSUM_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function clearChecksum(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CHECKSUM_KEY);
  localStorage.removeItem(CHECKSUM_META_KEY);
}

/**
 * Recalculate and save the combined checksum for all local data.
 * This should be called whenever local data changes (bookmarks, spaces, or pinned views).
 */
export async function recalculateAndSaveChecksum(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Get all local data
    const bookmarks = getBookmarks();

    // Import these dynamically to avoid circular dependencies
    const { getSpaces } = await import('@/lib/spacesStorage');
    const { getPinnedViews } = await import('@/lib/pinnedViewsStorage');
    const spaces = getSpaces();
    const pinnedViews = getPinnedViews();

    // Calculate combined checksum
    const checksum = await calculateCombinedChecksum(
      bookmarks,
      spaces,
      pinnedViews
    );

    // Save checksum metadata
    saveChecksumMeta({
      checksum,
      count: bookmarks.length + spaces.length + pinnedViews.length,
      lastUpdate: new Date().toISOString(),
      perTypeCounts: {
        bookmarks: bookmarks.length,
        spaces: spaces.length,
        pinnedViews: pinnedViews.length,
      },
    });
  } catch (error) {
    console.error('Failed to recalculate checksum:', error);
  }
}
