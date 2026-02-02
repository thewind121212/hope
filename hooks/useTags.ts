import { useState, useCallback, useEffect, useMemo } from "react";
import { getTags, type TagWithCount } from "@/lib/tagsStorage";

export interface UseTagsReturn {
  tags: TagWithCount[];
  refresh: () => void;
  isLoading: boolean;
}

/**
 * Hook for reactive tag data management.
 * Provides tags with usage counts and a refresh function for manual re-fetch.
 *
 * @example
 * const { tags, refresh, isLoading } = useTags()
 * // After rename/delete operation:
 * refresh()
 */
export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    const freshTags = getTags();
    setTags(freshTags);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      tags,
      refresh,
      isLoading,
    }),
    [tags, refresh, isLoading]
  );

  return value;
}
