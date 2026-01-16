import { v4 as uuidv4 } from 'uuid';
import { Bookmark } from './types';

const STORAGE_KEY = 'bookmark-vault-bookmarks';
const STORAGE_VERSION = 1;

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

  return newBookmark;
}

export function deleteBookmark(id: string): void {
  const bookmarks = loadBookmarks();
  const filtered = bookmarks.filter((b) => b.id !== id);
  saveBookmarks(filtered);
}

export function updateBookmark(bookmark: Bookmark): Bookmark | null {
  const bookmarks = loadBookmarks();
  const updated = bookmarks.map((item) =>
    item.id === bookmark.id ? bookmark : item
  );
  return saveBookmarks(updated) ? bookmark : null;
}

export function setBookmarks(bookmarks: Bookmark[]): boolean {
  return saveBookmarks(bookmarks);
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
