export const BOOKMARK_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
] as const;

export type BookmarkColor = (typeof BOOKMARK_COLORS)[number];

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  color?: BookmarkColor;
  createdAt: string;
}
