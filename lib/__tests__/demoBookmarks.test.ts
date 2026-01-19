import { describe, it, expect } from 'vitest';
import { demoBookmarks, getDemoBookmarksWithIds } from '@voc/lib/demoBookmarks';
import type { Bookmark } from '@voc/lib/types';

describe('demoBookmarks', () => {
  describe('demoBookmarks array', () => {
    it('has 5 demo bookmarks', () => {
      expect(demoBookmarks).toHaveLength(5);
    });

    it('each bookmark has required fields', () => {
      demoBookmarks.forEach((bookmark) => {
        expect(bookmark).toHaveProperty('title');
        expect(bookmark).toHaveProperty('url');
        expect(bookmark).toHaveProperty('description');
        expect(bookmark).toHaveProperty('tags');
        expect(bookmark).toHaveProperty('color');

        // Should NOT have id or createdAt (those are added later)
        expect(bookmark).not.toHaveProperty('id');
        expect(bookmark).not.toHaveProperty('createdAt');
      });
    });

    it('all titles are non-empty strings', () => {
      demoBookmarks.forEach((bookmark) => {
        expect(typeof bookmark.title).toBe('string');
        expect(bookmark.title.length).toBeGreaterThan(0);
      });
    });

    it('all URLs are valid URLs', () => {
      demoBookmarks.forEach((bookmark) => {
        expect(() => new URL(bookmark.url)).not.toThrow();
      });
    });

    it('all tags arrays are non-empty', () => {
      demoBookmarks.forEach((bookmark) => {
        expect(Array.isArray(bookmark.tags)).toBe(true);
        expect(bookmark.tags.length).toBeGreaterThan(0);
      });
    });

    it('has diverse categories', () => {
      const allTags = demoBookmarks.flatMap((b) => b.tags);
      const uniqueTags = [...new Set(allTags)];

      // Should have variety in tags
      expect(uniqueTags.length).toBeGreaterThan(5);
      expect(allTags).toContain('development');
      expect(allTags).toContain('documentation');
    });
  });

  describe('getDemoBookmarksWithIds', () => {
    it('returns bookmarks with id and createdAt', () => {
      const withIds = getDemoBookmarksWithIds();

      expect(withIds).toHaveLength(demoBookmarks.length);

      withIds.forEach((bookmark, index) => {
        expect(bookmark).toHaveProperty('id');
        expect(bookmark).toHaveProperty('createdAt');

        // id should be demo-{index}
        expect(bookmark.id).toBe(`demo-${index}`);

        // createdAt should be ISO string
        expect(typeof bookmark.createdAt).toBe('string');
        expect(new Date(bookmark.createdAt)).toBeInstanceOf(Date);
      });
    });

    it('returns valid Bookmark type', () => {
      const withIds = getDemoBookmarksWithIds();

      withIds.forEach((bookmark) => {
        // Type guard check - all Bookmark properties should exist
        expect(bookmark).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          url: expect.any(String),
          tags: expect.any(Array),
          createdAt: expect.any(String),
        } satisfies Partial<Bookmark>);
      });
    });

    it('preserves original data', () => {
      const withIds = getDemoBookmarksWithIds();

      withIds.forEach((bookmark, index) => {
        const original = demoBookmarks[index];
        expect(bookmark.title).toBe(original.title);
        expect(bookmark.url).toBe(original.url);
        expect(bookmark.description).toBe(original.description);
        expect(bookmark.tags).toEqual(original.tags);
        expect(bookmark.color).toBe(original.color);
      });
    });
  });
});
