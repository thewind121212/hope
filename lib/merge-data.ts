/**
 * Data Merge Utilities
 * 
 * Handles merging local and cloud data during sign-in migration.
 * Supports deduplication and conflict resolution strategies.
 */

import type { Bookmark, Space, PinnedView } from '@/lib/types';

export type MergeStrategy = 'merge' | 'local-wins' | 'cloud-wins';

export interface MergeResult<T> {
  items: T[];
  stats: {
    kept: number;
    merged: number;
    duplicates: number;
  };
}

export interface DataSet {
  bookmarks: Bookmark[];
  spaces: Space[];
  pinnedViews: PinnedView[];
}

export interface MergeOptions {
  strategy: MergeStrategy;
  dedupeBookmarksByUrl?: boolean;
}

/**
 * Check if two bookmarks are duplicates (same URL)
 */
function areBookmarksDuplicate(a: Bookmark, b: Bookmark): boolean {
  // Normalize URLs for comparison
  const normalizeUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      // Remove trailing slash and www prefix for comparison
      return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '') + parsed.search;
    } catch {
      return url.toLowerCase();
    }
  };
  
  return normalizeUrl(a.url) === normalizeUrl(b.url);
}

/**
 * Check if two spaces are duplicates (same name)
 */
function areSpacesDuplicate(a: Space, b: Space): boolean {
  return a.name.toLowerCase().trim() === b.name.toLowerCase().trim();
}

/**
 * Check if two pinned views are duplicates (same name in same space)
 */
function arePinnedViewsDuplicate(a: PinnedView, b: PinnedView): boolean {
  return a.spaceId === b.spaceId && 
         a.name.toLowerCase().trim() === b.name.toLowerCase().trim();
}

/**
 * Pick the newer item based on createdAt
 */
function pickNewer<T extends { createdAt: string }>(a: T, b: T): T {
  const dateA = new Date(a.createdAt).getTime();
  const dateB = new Date(b.createdAt).getTime();
  return dateA >= dateB ? a : b;
}

/**
 * Merge bookmarks based on strategy
 */
export function mergeBookmarks(
  local: Bookmark[],
  cloud: Bookmark[],
  options: MergeOptions
): MergeResult<Bookmark> {
  const { strategy, dedupeBookmarksByUrl = true } = options;
  
  if (strategy === 'local-wins') {
    return {
      items: local,
      stats: { kept: local.length, merged: 0, duplicates: 0 },
    };
  }
  
  if (strategy === 'cloud-wins') {
    return {
      items: cloud,
      stats: { kept: cloud.length, merged: 0, duplicates: 0 },
    };
  }
  
  // Merge strategy: combine both, dedupe by URL, keep newer
  const merged: Bookmark[] = [];
  const seenUrls = new Map<string, Bookmark>();
  let duplicates = 0;
  
  // Process all bookmarks (cloud first, then local)
  const all = [...cloud, ...local];
  
  for (const bookmark of all) {
    if (dedupeBookmarksByUrl) {
      const normalizedUrl = normalizeBookmarkUrl(bookmark.url);
      const existing = seenUrls.get(normalizedUrl);
      
      if (existing) {
        // Duplicate found - keep the newer one
        const newer = pickNewer(existing, bookmark);
        if (newer.id !== existing.id) {
          // Replace with newer
          const idx = merged.findIndex(b => b.id === existing.id);
          if (idx >= 0) {
            merged[idx] = newer;
          }
          seenUrls.set(normalizedUrl, newer);
        }
        duplicates++;
      } else {
        merged.push(bookmark);
        seenUrls.set(normalizedUrl, bookmark);
      }
    } else {
      // No deduplication - just add if ID doesn't exist
      if (!merged.some(b => b.id === bookmark.id)) {
        merged.push(bookmark);
      }
    }
  }
  
  return {
    items: merged,
    stats: {
      kept: merged.length,
      merged: local.length + cloud.length - duplicates,
      duplicates,
    },
  };
}

function normalizeBookmarkUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Merge spaces based on strategy
 */
export function mergeSpaces(
  local: Space[],
  cloud: Space[],
  options: MergeOptions
): MergeResult<Space> {
  const { strategy } = options;
  
  if (strategy === 'local-wins') {
    return {
      items: local,
      stats: { kept: local.length, merged: 0, duplicates: 0 },
    };
  }
  
  if (strategy === 'cloud-wins') {
    return {
      items: cloud,
      stats: { kept: cloud.length, merged: 0, duplicates: 0 },
    };
  }
  
  // Merge strategy: combine both, dedupe by name, keep newer
  const merged: Space[] = [];
  const seenNames = new Map<string, Space>();
  let duplicates = 0;
  
  const all = [...cloud, ...local];
  
  for (const space of all) {
    const normalizedName = space.name.toLowerCase().trim();
    const existing = seenNames.get(normalizedName);
    
    if (existing) {
      const newer = pickNewer(existing, space);
      if (newer.id !== existing.id) {
        const idx = merged.findIndex(s => s.id === existing.id);
        if (idx >= 0) {
          merged[idx] = newer;
        }
        seenNames.set(normalizedName, newer);
      }
      duplicates++;
    } else {
      merged.push(space);
      seenNames.set(normalizedName, space);
    }
  }
  
  return {
    items: merged,
    stats: {
      kept: merged.length,
      merged: local.length + cloud.length - duplicates,
      duplicates,
    },
  };
}

/**
 * Merge pinned views based on strategy
 */
export function mergePinnedViews(
  local: PinnedView[],
  cloud: PinnedView[],
  options: MergeOptions
): MergeResult<PinnedView> {
  const { strategy } = options;
  
  if (strategy === 'local-wins') {
    return {
      items: local,
      stats: { kept: local.length, merged: 0, duplicates: 0 },
    };
  }
  
  if (strategy === 'cloud-wins') {
    return {
      items: cloud,
      stats: { kept: cloud.length, merged: 0, duplicates: 0 },
    };
  }
  
  // Merge strategy: combine both, dedupe by spaceId+name, keep newer
  const merged: PinnedView[] = [];
  const seenKeys = new Map<string, PinnedView>();
  let duplicates = 0;
  
  const all = [...cloud, ...local];
  
  for (const view of all) {
    const key = `${view.spaceId}:${view.name.toLowerCase().trim()}`;
    const existing = seenKeys.get(key);
    
    if (existing) {
      const newer = pickNewer(existing, view);
      if (newer.id !== existing.id) {
        const idx = merged.findIndex(v => v.id === existing.id);
        if (idx >= 0) {
          merged[idx] = newer;
        }
        seenKeys.set(key, newer);
      }
      duplicates++;
    } else {
      merged.push(view);
      seenKeys.set(key, view);
    }
  }
  
  return {
    items: merged,
    stats: {
      kept: merged.length,
      merged: local.length + cloud.length - duplicates,
      duplicates,
    },
  };
}

/**
 * Merge all data types
 */
export function mergeAllData(
  local: DataSet,
  cloud: DataSet,
  options: MergeOptions
): {
  bookmarks: MergeResult<Bookmark>;
  spaces: MergeResult<Space>;
  pinnedViews: MergeResult<PinnedView>;
} {
  return {
    bookmarks: mergeBookmarks(local.bookmarks, cloud.bookmarks, options),
    spaces: mergeSpaces(local.spaces, cloud.spaces, options),
    pinnedViews: mergePinnedViews(local.pinnedViews, cloud.pinnedViews, options),
  };
}

/**
 * Count total items in a dataset
 */
export function countDataSet(data: DataSet): number {
  return data.bookmarks.length + data.spaces.length + data.pinnedViews.length;
}

/**
 * Check if a dataset has any data
 */
export function hasData(data: DataSet): boolean {
  return data.bookmarks.length > 0 || 
         data.spaces.length > 0 || 
         data.pinnedViews.length > 0;
}
