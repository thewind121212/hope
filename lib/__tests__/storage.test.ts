/**
 * @jest-environment jsdom
 */
import {
  addBookmark,
  deleteBookmark,
  getBookmarks,
  searchBookmarks,
  __resetCacheForTesting,
} from '@voc/lib/storage';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

type BookmarkInput = Parameters<typeof addBookmark>[0];

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const fixedDate = new Date('2025-01-01T00:00:00.000Z');

const baseBookmark: BookmarkInput = {
  title: 'React Docs',
  url: 'https://react.dev',
  description: 'React reference',
  tags: ['react', 'docs'],
};

beforeEach(() => {
  // Reset the in-memory cache to avoid stale data from previous tests
  __resetCacheForTesting();

  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true,
  });

  (uuidv4 as jest.Mock).mockReset().mockReturnValue('test-id');
  jest.useFakeTimers();
  jest.setSystemTime(fixedDate);
});

afterEach(() => {
  jest.useRealTimers();
  // Reset cache after each test to ensure clean state
  __resetCacheForTesting();
});

describe('storage', () => {
  it('getBookmarks returns empty array initially', () => {
    expect(getBookmarks()).toEqual([]);
  });

  it('addBookmark adds to storage', () => {
    const newBookmark = addBookmark(baseBookmark);

    expect(newBookmark.id).toBe('test-id');
    expect(newBookmark.createdAt).toBe(fixedDate.toISOString());
    expect(getBookmarks()).toEqual([newBookmark]);

    // Advance timers for debounced checksum recalculation
    jest.advanceTimersByTime(500);
  });

  it('deleteBookmark removes from storage', () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('remove-id');
    const bookmark = addBookmark(baseBookmark);

    // Advance timers for debounced checksum from addBookmark
    jest.advanceTimersByTime(500);

    deleteBookmark(bookmark.id);

    // Advance timers for debounced checksum from deleteBookmark
    jest.advanceTimersByTime(500);

    expect(getBookmarks()).toEqual([]);
  });

  it('searchBookmarks filters correctly', () => {
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('react-id')
      .mockReturnValueOnce('next-id');

    addBookmark(baseBookmark);
    addBookmark({
      title: 'Next.js Docs',
      url: 'https://nextjs.org',
      description: 'The React Framework',
      tags: ['nextjs'],
    });

    // Advance timers for debounced checksum recalculations
    jest.advanceTimersByTime(500);

    const results = searchBookmarks('react');

    expect(results).toHaveLength(2);
    expect(results.map((bookmark) => bookmark.id).sort()).toEqual([
      'next-id',
      'react-id',
    ]);
  });
});
