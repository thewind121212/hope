import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface BookmarkPreview {
  faviconUrl: string | null;
  siteName: string | null;
  ogImageUrl: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  lastFetchedAt: number | null;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  color?: string;
  createdAt: string;
  spaceId?: string;
  updatedAt?: string;
  preview?: BookmarkPreview;
  _syncVersion?: number;
}

// ============================================================================
// Constants
// ============================================================================

const PROJECT_PATH = '/Users/linh/Projects/ai-trainning';
const CAPTURE_DIR = 'validator-check';
const CAPTURE_FILE = 'bookmarks-captured.json';
const CAPTURE_FILE_PATH = `${PROJECT_PATH}/${CAPTURE_DIR}/${CAPTURE_FILE}`;

// ============================================================================
// Public API
// ============================================================================

/**
 * Gets the full path to the bookmark capture file.
 * Useful for debugging and logging.
 *
 * @returns The absolute path to the capture file
 */
export function getCaptureFilePath(): string {
  return CAPTURE_FILE_PATH;
}

/**
 * Checks if the bookmark capture file exists.
 *
 * @returns Promise<boolean> - true if file exists, false otherwise
 */
export async function isCaptureFileAvailable(): Promise<boolean> {
  try {
    await fs.access(CAPTURE_FILE_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads and parses the bookmark capture file.
 *
 * @returns Promise<Bookmark[]> - array of bookmarks, or empty array if file doesn't exist
 * @throws Error if JSON is invalid or file format is unexpected
 */
export async function getBookmarks(): Promise<Bookmark[]> {
  try {
    // Try to read the file
    const fileContent = await fs.readFile(CAPTURE_FILE_PATH, 'utf-8');

    // Parse JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(fileContent);
    } catch (parseError) {
      const err = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(
        `Failed to parse JSON from ${CAPTURE_FILE_PATH}: ${err}`
      );
    }

    // Validate structure and extract bookmarks
    if (typeof parsedData !== 'object' || parsedData === null) {
      throw new Error(
        `Invalid file format in ${CAPTURE_FILE_PATH}: expected an object at root, got ${typeof parsedData}`
      );
    }

    const obj = parsedData as Record<string, unknown>;

    // Extract the data array (handle both "data" and "bookmarks" keys for flexibility)
    const bookmarkData = obj.data ?? obj.bookmarks;

    if (!Array.isArray(bookmarkData)) {
      throw new Error(
        `Invalid file format in ${CAPTURE_FILE_PATH}: expected "data" or "bookmarks" to be an array, got ${typeof bookmarkData}`
      );
    }

    // Validate each bookmark has required fields
    const bookmarks: Bookmark[] = bookmarkData.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(
          `Invalid bookmark at index ${index} in ${CAPTURE_FILE_PATH}: expected an object, got ${typeof item}`
        );
      }

      const bm = item as Record<string, unknown>;

      // Validate required fields
      if (typeof bm.id !== 'string' || !bm.id) {
        throw new Error(
          `Invalid bookmark at index ${index} in ${CAPTURE_FILE_PATH}: missing or invalid "id" field`
        );
      }
      if (typeof bm.title !== 'string' || !bm.title) {
        throw new Error(
          `Invalid bookmark at index ${index} in ${CAPTURE_FILE_PATH}: missing or invalid "title" field`
        );
      }
      if (typeof bm.url !== 'string' || !bm.url) {
        throw new Error(
          `Invalid bookmark at index ${index} in ${CAPTURE_FILE_PATH}: missing or invalid "url" field`
        );
      }
      if (!Array.isArray(bm.tags)) {
        throw new Error(
          `Invalid bookmark at index ${index} in ${CAPTURE_FILE_PATH}: expected "tags" to be an array`
        );
      }
      if (typeof bm.createdAt !== 'string' || !bm.createdAt) {
        throw new Error(
          `Invalid bookmark at index ${index} in ${CAPTURE_FILE_PATH}: missing or invalid "createdAt" field`
        );
      }

      // Construct the bookmark with optional fields
      const bookmark: Bookmark = {
        id: bm.id,
        title: bm.title,
        url: bm.url,
        tags: bm.tags as string[],
        createdAt: bm.createdAt,
      };

      // Optional fields
      if (typeof bm.description === 'string') {
        bookmark.description = bm.description;
      }
      if (typeof bm.color === 'string') {
        bookmark.color = bm.color;
      }
      if (typeof bm.spaceId === 'string') {
        bookmark.spaceId = bm.spaceId;
      }
      if (typeof bm.updatedAt === 'string') {
        bookmark.updatedAt = bm.updatedAt;
      }
      if (typeof bm._syncVersion === 'number') {
        bookmark._syncVersion = bm._syncVersion;
      }

      // Handle preview object if present
      if (typeof bm.preview === 'object' && bm.preview !== null) {
        const previewObj = bm.preview as Record<string, unknown>;
        bookmark.preview = {
          faviconUrl: typeof previewObj.faviconUrl === 'string' ? previewObj.faviconUrl : null,
          siteName: typeof previewObj.siteName === 'string' ? previewObj.siteName : null,
          ogImageUrl: typeof previewObj.ogImageUrl === 'string' ? previewObj.ogImageUrl : null,
          previewTitle: typeof previewObj.previewTitle === 'string' ? previewObj.previewTitle : null,
          previewDescription: typeof previewObj.previewDescription === 'string' ? previewObj.previewDescription : null,
          lastFetchedAt: typeof previewObj.lastFetchedAt === 'number' ? previewObj.lastFetchedAt : null,
        };
      }

      return bookmark;
    });

    return bookmarks;
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return [];
    }

    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      `Unexpected error reading bookmarks from ${CAPTURE_FILE_PATH}: ${String(error)}`
    );
  }
}
