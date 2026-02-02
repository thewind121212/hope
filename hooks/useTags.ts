import { useState, useCallback, useMemo } from "react";
import { getTags, type TagWithCount } from "@/lib/tagsStorage";

export interface UseTagsReturn {
  tags: TagWithCount[];
  refresh: () => void;
}

/**
 * Hook for reactive tag data management.
 * Provides tags with usage counts and a refresh function for manual re-fetch.
 * Tags are loaded synchronously from localStorage on mount.
 *
 * @example
 * const { tags, refresh } = useTags()
 * // After rename/delete operation:
 * refresh()
 */
export function useTags(): UseTagsReturn {
  // Initialize synchronously from localStorage - no loading state needed
  const [tags, setTags] = useState<TagWithCount[]>(() => getTags());

  const refresh = useCallback(() => {
    setTags(getTags());
  }, []);

  const value = useMemo(
    () => ({
      tags,
      refresh,
    }),
    [tags, refresh]
  );

  return value;
}
