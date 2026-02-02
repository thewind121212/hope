import { Bookmark } from "@/lib/types";
import { getBookmarks, setBookmarks, invalidateBookmarkCache } from "@/lib/storage";
import { debouncedRecalculateChecksumExport } from "@/lib/storage";

const MAX_TAG_LENGTH = 50;

export interface TagWithCount {
  name: string;
  count: number;
}

function validateTagName(name: string, allowExistingCheck?: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Tag name cannot be empty" };
  }

  if (trimmed.length > MAX_TAG_LENGTH) {
    return { valid: false, error: `Tag name must be ${MAX_TAG_LENGTH} characters or less` };
  }

  if (trimmed.includes(",")) {
    return { valid: false, error: "Tag name cannot contain commas" };
  }

  if (allowExistingCheck && trimmed === allowExistingCheck) {
    return { valid: true };
  }

  return { valid: true };
}

export function getTags(): TagWithCount[] {
  const bookmarks = getBookmarks();
  const tagCounts = new Map<string, number>();

  bookmarks.forEach((bookmark: Bookmark) => {
    bookmark.tags.forEach((tag: string) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  const tags: TagWithCount[] = [];
  tagCounts.forEach((count, name) => {
    tags.push({ name, count });
  });

  return tags.sort((a, b) => a.name.localeCompare(b.name));
}

export interface TagOperationResult {
  success: boolean;
  affectedBookmarks: Bookmark[];
}

export function renameTag(oldName: string, newName: string): TagOperationResult {
  const oldValidation = validateTagName(oldName);
  if (!oldValidation.valid) {
    console.error(`Invalid old tag name: ${oldValidation.error}`);
    return { success: false, affectedBookmarks: [] };
  }

  const newValidation = validateTagName(newName, oldName);
  if (!newValidation.valid) {
    console.error(`Invalid new tag name: ${newValidation.error}`);
    return { success: false, affectedBookmarks: [] };
  }

  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  const bookmarks = getBookmarks();
  const affectedBookmarks: Bookmark[] = [];

  const updatedBookmarks = bookmarks.map((bookmark: Bookmark) => {
    const hasTag = bookmark.tags.includes(trimmedOldName);
    if (hasTag) {
      const updatedBookmark = {
        ...bookmark,
        tags: bookmark.tags.map((tag: string) =>
          tag === trimmedOldName ? trimmedNewName : tag
        ),
        updatedAt: new Date().toISOString(),
      };
      affectedBookmarks.push(updatedBookmark);
      return updatedBookmark;
    }
    return bookmark;
  });

  if (affectedBookmarks.length === 0) {
    return { success: true, affectedBookmarks: [] };
  }

  const saved = setBookmarks(updatedBookmarks);
  if (saved) {
    invalidateBookmarkCache();
    debouncedRecalculateChecksumExport();
  }

  return { success: saved, affectedBookmarks: saved ? affectedBookmarks : [] };
}

export function deleteTag(name: string): TagOperationResult {
  const validation = validateTagName(name);
  if (!validation.valid) {
    console.error(`Invalid tag name: ${validation.error}`);
    return { success: false, affectedBookmarks: [] };
  }

  const trimmedName = name.trim();
  const bookmarks = getBookmarks();
  const affectedBookmarks: Bookmark[] = [];

  const updatedBookmarks = bookmarks.map((bookmark: Bookmark) => {
    const hasTag = bookmark.tags.includes(trimmedName);
    if (hasTag) {
      const updatedBookmark = {
        ...bookmark,
        tags: bookmark.tags.filter((tag: string) => tag !== trimmedName),
        updatedAt: new Date().toISOString(),
      };
      affectedBookmarks.push(updatedBookmark);
      return updatedBookmark;
    }
    return bookmark;
  });

  if (affectedBookmarks.length === 0) {
    return { success: true, affectedBookmarks: [] };
  }

  const saved = setBookmarks(updatedBookmarks);
  if (saved) {
    invalidateBookmarkCache();
    debouncedRecalculateChecksumExport();
  }

  return { success: saved, affectedBookmarks: saved ? affectedBookmarks : [] };
}
