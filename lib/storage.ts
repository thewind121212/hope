import { v4 as uuidv4 } from 'uuid';
import { Bookmark } from './types';

const STORAGE_KEY = 'bookmark-vault-bookmarks';

export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBookmark(
  bookmark: Omit<Bookmark, 'id' | 'createdAt'>
): Bookmark {
  const newBookmark: Bookmark = {
    ...bookmark,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  try {
    const bookmarks = getBookmarks();
    bookmarks.push(newBookmark);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Silently fail if localStorage is not available
  }

  return newBookmark;
}

export function deleteBookmark(id: string): void {
  try {
    const bookmarks = getBookmarks();
    const filtered = bookmarks.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function setBookmarks(bookmarks: Bookmark[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    return true;
  } catch {
    return false;
  }
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
