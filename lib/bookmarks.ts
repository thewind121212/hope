import { Bookmark } from "@/lib/types";

export type SortKey = "newest" | "oldest" | "title";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
];

export const getUniqueTags = (bookmarks: Bookmark[]) => {
  const tags = new Set<string>();
  bookmarks.forEach((bookmark) => {
    bookmark.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
};

export const filterByTag = (bookmarks: Bookmark[], tag: string) => {
  if (!tag || tag === "all") return bookmarks;
  return bookmarks.filter((bookmark) => bookmark.tags.includes(tag));
};

export const sortBookmarks = (bookmarks: Bookmark[], sortKey: SortKey) => {
  const sorted = [...bookmarks];
  if (sortKey === "oldest") {
    return sorted.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  if (sortKey === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
